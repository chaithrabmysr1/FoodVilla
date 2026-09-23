package com.example.foodVilla.delivery_service.repository;

import com.example.foodVilla.delivery_service.entity.DeliveryAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeliveryAssignmentRepository extends JpaRepository<DeliveryAssignment, Long> {
    Optional<DeliveryAssignment> findFirstByOrderIdOrderByAssignedAtDesc(Long orderId);
    List<DeliveryAssignment> findByDeliveryPartnerId(Long deliveryPartnerId);
}
