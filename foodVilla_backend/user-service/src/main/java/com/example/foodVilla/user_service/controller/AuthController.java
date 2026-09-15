package com.example.foodVilla.user_service.controller;


import com.example.foodVilla.user_service.dto.*;
import com.example.foodVilla.user_service.entity.User;
import com.example.foodVilla.user_service.repository.UserRepository;
import com.example.foodVilla.user_service.security.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthController(UserRepository userRepository, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email already exists"));
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setAddress(request.getAddress());
        user.setRole(request.getRole() != null ? request.getRole() : "USER");

        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "User registered successfully ✅"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        return userRepository.findByEmail(request.getEmail())
                .map(u -> {
                    if (passwordEncoder.matches(request.getPassword(), u.getPassword())) {
                        String token = jwtUtil.generateToken(u.getEmail());
                        return ResponseEntity.ok(Map.of(
                                "token", token,
                                "fullName", u.getFullName(),
                                "phoneNumber", u.getPhoneNumber(),
                                "address", u.getAddress(),
                                "role", u.getRole(),
                                "message", "Login successful ✅"
                        ));
                    } else {
                        return ResponseEntity.badRequest().body(Map.of("message", "Invalid credentials ❌"));
                    }
                })
                .orElse(ResponseEntity.badRequest().body(Map.of("message", "User not found ❌")));
    }

    @GetMapping("/profile")
    public String getProfile(@AuthenticationPrincipal UserDetails user) {
        if (user == null) return "User not authenticated";
        return "Hello, " + user.getUsername();
    }
}
