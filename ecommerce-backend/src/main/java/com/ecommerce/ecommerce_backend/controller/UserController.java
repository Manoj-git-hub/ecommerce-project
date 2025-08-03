package com.ecommerce.ecommerce_backend.controller;

import com.ecommerce.ecommerce_backend.model.User;
import com.ecommerce.ecommerce_backend.payload.request.UpdateProfileRequest;
import com.ecommerce.ecommerce_backend.payload.response.MessageResponse;
import com.ecommerce.ecommerce_backend.payload.response.UserProfileResponse;
import com.ecommerce.ecommerce_backend.security.services.UserDetailsImpl;
import com.ecommerce.ecommerce_backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus; // <--- ENSURE THIS IS IMPORTED
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional; // <--- MAKE SURE THIS IS IMPORTED

@CrossOrigin(origins = "http://127.0.0.1:5500", maxAge = 3600)
@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
public class UserController {

    @Autowired
    private UserService userService;

    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userDetails.getUsername();
    }

    // --- START OF CORRECTED getUserProfile() METHOD ---
    @GetMapping("/profile")
    public ResponseEntity<?> getUserProfile() {
        String username = getCurrentUsername();
        Optional<User> userOptional = userService.getUserByUsername(username); // Changed to
                                                                               // Optional<com.ecommerce.backend.model.User>

        if (userOptional.isPresent()) {
            User user = userOptional.get(); // Get the User object
            return ResponseEntity.ok(new UserProfileResponse(user.getId(), user.getUsername(), user.getEmail()));
        } else {
            return new ResponseEntity<>(new MessageResponse("User profile not found."), HttpStatus.NOT_FOUND);
        }
    }
    // --- END OF CORRECTED getUserProfile() METHOD ---

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        String username = getCurrentUsername();
        try {
            userService.updateProfile(username, request);
            return ResponseEntity.ok(new MessageResponse("Profile updated successfully!"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }
}