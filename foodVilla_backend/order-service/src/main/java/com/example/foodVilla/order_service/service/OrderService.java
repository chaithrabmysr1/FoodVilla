package com.example.foodVilla.order_service.service;

import com.example.foodVilla.order_service.dto.*;
import com.example.foodVilla.order_service.entity.*;
import com.example.foodVilla.order_service.exception.OrderAccessDeniedException;
import com.example.foodVilla.order_service.exception.ResourceNotFoundException;
import com.example.foodVilla.order_service.messaging.OrderEventPublisher;
import com.example.foodVilla.order_service.repository.OrderRepository;
import com.example.foodVilla.order_service.security.AuthenticatedUser;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private OrderStatusTransitionValidator transitionValidator;

    @Autowired
    private OrderEventPublisher eventPublisher;

    @Autowired
    private PaymentPolicy paymentPolicy;

    @Value("${catalogue.service.url}")
    private String catalogueServiceUrl;

    @Value("${order.delivery-fee}")
    private BigDecimal deliveryFeeConfig;

    @Value("${order.tax-rate}")
    private BigDecimal taxRateConfig;

    private static final String ADMIN_ROLE = "ADMIN";

    @Transactional
    public OrderCreationResult createOrder(AuthenticatedUser principal, CreateOrderRequest request, String idempotencyKey) {
        var existing = orderRepository.findByUserIdAndIdempotencyKey(principal.userId(), idempotencyKey);
        if (existing.isPresent()) {
            return new OrderCreationResult(existing.get(), false);
        }

        CatalogueResponseDTO catalogue = fetchCatalogue(request.getRestaurantId());
        Pricing pricing = price(request.getRestaurantId(), request.getItems(), catalogue);

        Order order = new Order();
        order.setUserId(principal.userId());
        order.setCustomerEmail(principal.email());
        order.setRestaurantId(request.getRestaurantId());
        order.setRestaurantName(catalogue.getRestaurant().getName());
        order.setIdempotencyKey(idempotencyKey);
        pricing.items().forEach(order::addItem);

        order.setSubtotalAmount(pricing.subtotal());
        order.setDeliveryFee(pricing.deliveryFee());
        order.setTaxAmount(pricing.tax());
        order.setDiscountAmount(pricing.discount());
        order.setFinalAmount(pricing.finalAmount());
        order.setDeliveryAddress(toEntityAddress(request.getDeliveryAddress()));
        order.setOrderStatus(OrderStatus.CREATED);
        order.setPaymentStatus(PaymentStatus.PENDING);
        order.addStatusHistory(new OrderStatusHistory(order, OrderStatus.CREATED, "Order placed, awaiting payment"));

        // The order is deliberately NOT sent to the restaurant here. It stays
        // CREATED until PaymentService has verified a Razorpay payment for it,
        // and only that moves it to RESTAURANT_PENDING.
        Order saved = orderRepository.save(order);
        eventPublisher.publishStatusChanged(saved, null, "Order placed, awaiting payment");
        return new OrderCreationResult(saved, true);
    }

    /**
     * Prices a cart with exactly the rules createOrder uses, without saving
     * anything. Checkout calls this to show the real bill before the customer
     * commits to an order.
     */
    public OrderQuoteResponse quote(OrderQuoteRequest request) {
        CatalogueResponseDTO catalogue = fetchCatalogue(request.restaurantId());
        Pricing pricing = price(request.restaurantId(), request.items(), catalogue);

        List<OrderItemResponse> lines = pricing.items().stream().map(item -> {
            OrderItemResponse line = new OrderItemResponse();
            line.setFoodItemId(item.getFoodItemId());
            line.setItemName(item.getItemName());
            line.setPrice(item.getPrice());
            line.setQuantity(item.getQuantity());
            line.setSubtotal(item.getSubtotal());
            return line;
        }).toList();

        return new OrderQuoteResponse(lines, pricing.subtotal(), pricing.deliveryFee(), pricing.tax(),
                pricing.discount(), pricing.finalAmount(), "INR");
    }

    private record Pricing(List<OrderItem> items, BigDecimal subtotal, BigDecimal deliveryFee,
                           BigDecimal tax, BigDecimal discount, BigDecimal finalAmount) {
    }

    // Prices come from the catalogue, never from the client. There is no
    // promotion engine yet, so the discount is always zero.
    private Pricing price(Long restaurantId, List<OrderItemRequest> requestedItems, CatalogueResponseDTO catalogue) {
        Map<Long, CatalogueFoodItemDTO> itemsById = new HashMap<>();
        for (CatalogueFoodItemDTO item : catalogue.getFoodItems()) {
            itemsById.put(item.getId(), item);
        }

        List<OrderItem> lines = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        for (OrderItemRequest itemRequest : requestedItems) {
            CatalogueFoodItemDTO catalogueItem = itemsById.get(itemRequest.getFoodItemId());
            if (catalogueItem == null || !restaurantId.equals(catalogueItem.getRestaurantId())) {
                throw new ResourceNotFoundException(
                        "Food item not found for this restaurant: id=" + itemRequest.getFoodItemId());
            }

            BigDecimal price = BigDecimal.valueOf(catalogueItem.getPrice());
            BigDecimal itemSubtotal = price.multiply(BigDecimal.valueOf(itemRequest.getQuantity()));

            OrderItem orderItem = new OrderItem();
            orderItem.setFoodItemId(catalogueItem.getId());
            orderItem.setItemName(catalogueItem.getItemName());
            orderItem.setPrice(price);
            orderItem.setQuantity(itemRequest.getQuantity());
            orderItem.setSubtotal(itemSubtotal);
            lines.add(orderItem);

            subtotal = subtotal.add(itemSubtotal);
        }

        BigDecimal deliveryFee = deliveryFeeConfig.setScale(2, RoundingMode.HALF_UP);
        BigDecimal tax = subtotal.multiply(taxRateConfig).setScale(2, RoundingMode.HALF_UP);
        BigDecimal discount = BigDecimal.ZERO;
        BigDecimal finalAmount = subtotal.add(deliveryFee).add(tax).subtract(discount);
        return new Pricing(lines, subtotal, deliveryFee, tax, discount, finalAmount);
    }

    public OrderResponse getOrder(Long orderId, AuthenticatedUser principal) {
        Order order = findOrderOrThrow(orderId);
        ensureOwnerOrAdmin(order, principal);
        return toResponse(order);
    }

    public Page<OrderResponse> listMyOrders(AuthenticatedUser principal, Pageable pageable) {
        return orderRepository.findByUserId(principal.userId(), pageable).map(this::toResponse);
    }

    public Page<OrderResponse> listOrdersForRestaurant(Long restaurantId, Pageable pageable) {
        return orderRepository.findByRestaurantId(restaurantId, pageable).map(this::toResponse);
    }

    public Page<OrderResponse> listAllOrders(OrderStatus statusFilter, Pageable pageable) {
        if (statusFilter != null) {
            return orderRepository.findByOrderStatus(statusFilter, pageable).map(this::toResponse);
        }
        return orderRepository.findAll(pageable).map(this::toResponse);
    }

    @Transactional
    public OrderResponse cancelOrder(Long orderId, AuthenticatedUser principal, String reason) {
        Order order = findOrderOrThrow(orderId);
        ensureOwnerOrAdmin(order, principal);
        transitionValidator.validateCancellable(order.getOrderStatus());

        OrderStatus previousStatus = order.getOrderStatus();
        order.setOrderStatus(OrderStatus.CANCELLED);
        String note = (reason == null || reason.isBlank()) ? "Cancelled by customer" : reason;
        order.addStatusHistory(new OrderStatusHistory(order, OrderStatus.CANCELLED, note));

        Order saved = orderRepository.save(order);
        eventPublisher.publishStatusChanged(saved, previousStatus, note);
        return toResponse(saved);
    }

    @Transactional
    public OrderResponse updateStatus(Long orderId, OrderStatus newStatus, String note) {
        Order order = findOrderOrThrow(orderId);
        transitionValidator.validateTransition(order.getOrderStatus(), newStatus);

        OrderStatus previousStatus = order.getOrderStatus();
        order.setOrderStatus(newStatus);
        if (newStatus == OrderStatus.PAYMENT_CONFIRMED) {
            order.setPaymentStatus(PaymentStatus.CONFIRMED);
        } else if (newStatus == OrderStatus.PAYMENT_FAILED) {
            order.setPaymentStatus(PaymentStatus.FAILED);
        }
        order.addStatusHistory(new OrderStatusHistory(order, newStatus, note));

        Order saved = orderRepository.save(order);
        eventPublisher.publishStatusChanged(saved, previousStatus, note);
        return toResponse(saved);
    }

    private CatalogueResponseDTO fetchCatalogue(Long restaurantId) {
        try {
            CatalogueResponseDTO response = restTemplate.getForObject(catalogueServiceUrl + restaurantId, CatalogueResponseDTO.class);
            if (response == null || response.getRestaurant() == null) {
                throw new ResourceNotFoundException("Restaurant not found with ID: " + restaurantId);
            }
            return response;
        } catch (HttpClientErrorException.NotFound ex) {
            throw new ResourceNotFoundException("Restaurant not found with ID: " + restaurantId);
        }
    }

    private Order findOrderOrThrow(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));
    }

    void ensureOwnerOrAdmin(Order order, AuthenticatedUser principal) {
        boolean isOwner = order.getUserId().equals(principal.userId());
        boolean isAdmin = ADMIN_ROLE.equals(principal.role());
        if (!isOwner && !isAdmin) {
            throw new OrderAccessDeniedException("You do not have access to this order");
        }
    }

    private DeliveryAddress toEntityAddress(DeliveryAddressRequest request) {
        DeliveryAddress address = new DeliveryAddress();
        address.setRecipientName(request.getRecipientName());
        address.setPhone(request.getPhone());
        address.setAddressLine1(request.getAddressLine1());
        address.setAddressLine2(request.getAddressLine2());
        address.setCity(request.getCity());
        address.setState(request.getState());
        address.setPincode(request.getPincode());
        address.setLandmark(request.getLandmark());
        address.setLabel(request.getLabel());
        return address;
    }

    private DeliveryAddressResponse toResponseAddress(DeliveryAddress address) {
        DeliveryAddressResponse response = new DeliveryAddressResponse();
        if (address == null) {
            return response;
        }
        response.setRecipientName(address.getRecipientName());
        response.setPhone(address.getPhone());
        response.setAddressLine1(address.getAddressLine1());
        response.setAddressLine2(address.getAddressLine2());
        response.setCity(address.getCity());
        response.setState(address.getState());
        response.setPincode(address.getPincode());
        response.setLandmark(address.getLandmark());
        response.setLabel(address.getLabel());
        return response;
    }

    public OrderResponse toResponse(Order order) {
        OrderResponse response = new OrderResponse();
        response.setId(order.getId());
        response.setUserId(order.getUserId());
        response.setCustomerEmail(order.getCustomerEmail());
        response.setRestaurantId(order.getRestaurantId());
        response.setRestaurantName(order.getRestaurantName());
        response.setDeliveryPartnerId(order.getDeliveryPartnerId());
        response.setSubtotalAmount(order.getSubtotalAmount());
        response.setDeliveryFee(order.getDeliveryFee());
        response.setTaxAmount(order.getTaxAmount());
        response.setDiscountAmount(order.getDiscountAmount());
        response.setFinalAmount(order.getFinalAmount());
        response.setPaymentId(order.getPaymentId());
        response.setPaymentStatus(order.getPaymentStatus());
        response.setPaymentProvider(order.getPaymentProvider());
        response.setPaidAt(order.getPaidAt());
        response.setPaymentFailureReason(order.getPaymentFailureReason());
        response.setPaymentExpired(paymentPolicy.isExpired(order));
        response.setOrderStatus(order.getOrderStatus());
        response.setDeliveryAddress(toResponseAddress(order.getDeliveryAddress()));
        response.setCreatedAt(order.getCreatedAt());
        response.setUpdatedAt(order.getUpdatedAt());

        List<OrderItemResponse> items = order.getItems().stream().map(item -> {
            OrderItemResponse itemResponse = new OrderItemResponse();
            itemResponse.setFoodItemId(item.getFoodItemId());
            itemResponse.setItemName(item.getItemName());
            itemResponse.setPrice(item.getPrice());
            itemResponse.setQuantity(item.getQuantity());
            itemResponse.setSubtotal(item.getSubtotal());
            return itemResponse;
        }).toList();
        response.setItems(items);

        List<OrderStatusHistoryResponse> history = order.getStatusHistory().stream().map(h -> {
            OrderStatusHistoryResponse historyResponse = new OrderStatusHistoryResponse();
            historyResponse.setStatus(h.getStatus());
            historyResponse.setChangedAt(h.getChangedAt());
            historyResponse.setNote(h.getNote());
            return historyResponse;
        }).toList();
        response.setStatusHistory(history);

        return response;
    }
}
