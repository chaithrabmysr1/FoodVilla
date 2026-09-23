package com.example.foodVilla.order_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * A snapshot of the delivery address at the time the order was placed.
 * Not a standalone saved-address resource — see the Phase 1 plan's decision
 * to defer full address-book management (multiple saved addresses, CRUD) to
 * a later phase.
 */
@Embeddable
public class DeliveryAddress {

    @Column(name = "recipient_name")
    private String recipientName;

    private String phone;

    @Column(name = "address_line1")
    private String addressLine1;

    @Column(name = "address_line2")
    private String addressLine2;

    private String city;
    private String state;
    private String pincode;
    private String landmark;
    private String label;

    public DeliveryAddress() {
    }

    public String getRecipientName() { return recipientName; }
    public void setRecipientName(String recipientName) { this.recipientName = recipientName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddressLine1() { return addressLine1; }
    public void setAddressLine1(String addressLine1) { this.addressLine1 = addressLine1; }

    public String getAddressLine2() { return addressLine2; }
    public void setAddressLine2(String addressLine2) { this.addressLine2 = addressLine2; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getPincode() { return pincode; }
    public void setPincode(String pincode) { this.pincode = pincode; }

    public String getLandmark() { return landmark; }
    public void setLandmark(String landmark) { this.landmark = landmark; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
}
