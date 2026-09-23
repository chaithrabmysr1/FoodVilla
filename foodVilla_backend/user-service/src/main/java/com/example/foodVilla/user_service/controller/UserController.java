package com.example.foodVilla.user_service.controller;

import com.example.foodVilla.user_service.dto.UpdateRoleRequest;
import com.example.foodVilla.user_service.dto.UserResponse;
import com.example.foodVilla.user_service.entity.User;
import com.example.foodVilla.user_service.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * ADMIN-only user management — see SecurityConfig, /api/users/** requires
 * hasRole("ADMIN"). Never returns password hashes (see UserResponse).
 */
@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "${cors.allowed.origin}")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> listUsers() {
        List<UserResponse> users = userRepository.findAll().stream().map(this::toResponse).toList();
        return ResponseEntity.ok(users);
    }

    @PutMapping("/{id}/role")
    public ResponseEntity<?> updateRole(@PathVariable Long id, @Valid @RequestBody UpdateRoleRequest request) {
        Optional<User> existing = userRepository.findById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "User not found"));
        }
        User user = existing.get();
        user.setRole(request.getRole());
        userRepository.save(user);
        return ResponseEntity.ok(toResponse(user));
    }

    private UserResponse toResponse(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setFullName(user.getFullName());
        response.setPhoneNumber(user.getPhoneNumber());
        response.setAddress(user.getAddress());
        response.setRole(user.getRole());
        return response;
    }
}
