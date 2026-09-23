package com.example.foodVilla.delivery_service.service;

import com.example.foodVilla.delivery_service.dto.AssignDeliveryRequest;
import com.example.foodVilla.delivery_service.dto.CreateDeliveryPartnerRequest;
import com.example.foodVilla.delivery_service.dto.UpdateDeliveryPartnerRequest;
import com.example.foodVilla.delivery_service.entity.DeliveryAssignment;
import com.example.foodVilla.delivery_service.entity.DeliveryAssignmentStatus;
import com.example.foodVilla.delivery_service.entity.DeliveryPartner;
import com.example.foodVilla.delivery_service.event.DeliveryEvent;
import com.example.foodVilla.delivery_service.exception.InvalidAssignmentStatusException;
import com.example.foodVilla.delivery_service.exception.ResourceNotFoundException;
import com.example.foodVilla.delivery_service.messaging.DeliveryEventPublisher;
import com.example.foodVilla.delivery_service.repository.DeliveryAssignmentRepository;
import com.example.foodVilla.delivery_service.repository.DeliveryPartnerRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
public class DeliveryService {

    @Autowired
    private DeliveryPartnerRepository partnerRepository;

    @Autowired
    private DeliveryAssignmentRepository assignmentRepository;

    @Autowired
    private DeliveryEventPublisher eventPublisher;

    public DeliveryPartner createPartner(CreateDeliveryPartnerRequest request) {
        DeliveryPartner partner = new DeliveryPartner();
        partner.setName(request.getName());
        partner.setPhone(request.getPhone());
        partner.setVehicleType(request.getVehicleType());
        return partnerRepository.save(partner);
    }

    public List<DeliveryPartner> listPartners(Boolean availableOnly) {
        if (Boolean.TRUE.equals(availableOnly)) {
            return partnerRepository.findByAvailableTrueAndActiveTrue();
        }
        return partnerRepository.findAll();
    }

    @Transactional
    public DeliveryPartner updatePartner(Long id, UpdateDeliveryPartnerRequest request) {
        DeliveryPartner partner = partnerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery partner not found with ID: " + id));
        if (request.getName() != null) partner.setName(request.getName());
        if (request.getPhone() != null) partner.setPhone(request.getPhone());
        if (request.getVehicleType() != null) partner.setVehicleType(request.getVehicleType());
        if (request.getAvailable() != null) partner.setAvailable(request.getAvailable());
        if (request.getActive() != null) partner.setActive(request.getActive());
        return partnerRepository.save(partner);
    }

    @Transactional
    public DeliveryAssignment assignDelivery(AssignDeliveryRequest request) {
        DeliveryPartner partner = partnerRepository.findById(request.getDeliveryPartnerId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Delivery partner not found with ID: " + request.getDeliveryPartnerId()));
        if (!partner.isActive() || !partner.isAvailable()) {
            throw new InvalidAssignmentStatusException("Delivery partner is not available for assignment");
        }

        DeliveryAssignment assignment = new DeliveryAssignment();
        assignment.setOrderId(request.getOrderId());
        assignment.setRestaurantId(request.getRestaurantId());
        assignment.setDeliveryPartnerId(request.getDeliveryPartnerId());
        assignment.setStatus(DeliveryAssignmentStatus.ASSIGNED);

        DeliveryAssignment saved = assignmentRepository.save(assignment);

        partner.setAvailable(false);
        partnerRepository.save(partner);

        eventPublisher.publish(new DeliveryEvent(
                request.getOrderId(), request.getDeliveryPartnerId(), DeliveryEvent.Type.ASSIGNED));

        return saved;
    }

    @Transactional
    public DeliveryAssignment acceptAssignment(Long id) {
        DeliveryAssignment assignment = findAssignmentOrThrow(id);
        requireStatus(assignment, EnumSet.of(DeliveryAssignmentStatus.ASSIGNED));
        assignment.setStatus(DeliveryAssignmentStatus.ACCEPTED);
        assignment.setAcceptedAt(LocalDateTime.now());
        return assignmentRepository.save(assignment);
    }

    @Transactional
    public DeliveryAssignment markPickedUp(Long id) {
        DeliveryAssignment assignment = findAssignmentOrThrow(id);
        requireStatus(assignment, EnumSet.of(DeliveryAssignmentStatus.ASSIGNED, DeliveryAssignmentStatus.ACCEPTED));
        assignment.setStatus(DeliveryAssignmentStatus.PICKED_UP);
        assignment.setPickedUpAt(LocalDateTime.now());
        DeliveryAssignment saved = assignmentRepository.save(assignment);
        eventPublisher.publish(new DeliveryEvent(
                assignment.getOrderId(), assignment.getDeliveryPartnerId(), DeliveryEvent.Type.PICKED_UP));
        return saved;
    }

    @Transactional
    public DeliveryAssignment markOutForDelivery(Long id) {
        DeliveryAssignment assignment = findAssignmentOrThrow(id);
        requireStatus(assignment, EnumSet.of(DeliveryAssignmentStatus.PICKED_UP));
        assignment.setStatus(DeliveryAssignmentStatus.OUT_FOR_DELIVERY);
        assignment.setOutForDeliveryAt(LocalDateTime.now());
        DeliveryAssignment saved = assignmentRepository.save(assignment);
        eventPublisher.publish(new DeliveryEvent(
                assignment.getOrderId(), assignment.getDeliveryPartnerId(), DeliveryEvent.Type.OUT_FOR_DELIVERY));
        return saved;
    }

    @Transactional
    public DeliveryAssignment markDelivered(Long id) {
        DeliveryAssignment assignment = findAssignmentOrThrow(id);
        requireStatus(assignment, EnumSet.of(DeliveryAssignmentStatus.OUT_FOR_DELIVERY));
        assignment.setStatus(DeliveryAssignmentStatus.DELIVERED);
        assignment.setDeliveredAt(LocalDateTime.now());
        DeliveryAssignment saved = assignmentRepository.save(assignment);

        partnerRepository.findById(assignment.getDeliveryPartnerId()).ifPresent(partner -> {
            partner.setAvailable(true);
            partnerRepository.save(partner);
        });

        eventPublisher.publish(new DeliveryEvent(
                assignment.getOrderId(), assignment.getDeliveryPartnerId(), DeliveryEvent.Type.DELIVERED));
        return saved;
    }

    public DeliveryPartner getPartnerOrThrow(Long id) {
        return partnerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery partner not found with ID: " + id));
    }

    public DeliveryAssignment getAssignmentForOrder(Long orderId) {
        return assignmentRepository.findFirstByOrderIdOrderByAssignedAtDesc(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("No delivery assignment found for order: " + orderId));
    }

    private DeliveryAssignment findAssignmentOrThrow(Long id) {
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery assignment not found with ID: " + id));
    }

    private void requireStatus(DeliveryAssignment assignment, Set<DeliveryAssignmentStatus> allowed) {
        if (!allowed.contains(assignment.getStatus())) {
            throw new InvalidAssignmentStatusException(
                    "Assignment is " + assignment.getStatus() + ", expected one of " + allowed);
        }
    }
}
