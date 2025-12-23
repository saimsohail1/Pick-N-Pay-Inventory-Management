package com.picknpay.controller;

import com.picknpay.dto.UserDTO;
import com.picknpay.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserService userService;
    
    @Autowired
    private PasswordEncoder passwordEncoder;

	@PostMapping("/login")
	public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
		try {
            // Find user by username
            Optional<UserDTO> userOpt = userService.getUserByUsername(loginRequest.username());
            
            if (userOpt.isPresent()) {
                UserDTO user = userOpt.get();
                
                // Check if user is active
                if (!user.getIsActive()) {
                    Map<String, String> response = new HashMap<>();
                    response.put("success", "false");
                    response.put("message", "Account is deactivated. Contact administrator.");
                    return ResponseEntity.badRequest().body(response);
                }
                
                // Use BCrypt password verification
                if (passwordEncoder.matches(loginRequest.password(), user.getPassword())) {
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", "true");
                    response.put("message", "Login successful");
                    response.put("token", "authenticated_" + user.getId()); // Simple token for now
                    
                    // Create user response without password
                    Map<String, Object> userResponse = new HashMap<>();
                    userResponse.put("id", user.getId());
                    userResponse.put("username", user.getUsername());
                    userResponse.put("email", user.getEmail());
                    userResponse.put("fullName", user.getFullName());
                    userResponse.put("role", user.getRole());
                    userResponse.put("isActive", user.getIsActive());
                    userResponse.put("createdAt", user.getCreatedAt());
                    
                    response.put("user", userResponse);
                    
                    return ResponseEntity.ok(response);
                } else {
                    Map<String, String> response = new HashMap<>();
                    response.put("success", "false");
                    response.put("message", "Invalid password");
                    return ResponseEntity.badRequest().body(response);
                }
			} else {
                Map<String, String> response = new HashMap<>();
                response.put("success", "false");
                response.put("message", "User not found");
                return ResponseEntity.badRequest().body(response);
			}
		} catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("success", "false");
            response.put("message", "Login failed. Please try again.");
            return ResponseEntity.badRequest().body(response);
		}
	}

	public record LoginRequest(String username, String password) {
	}

}