package com.picknpay.service;

import com.picknpay.dto.UserDTO;
import com.picknpay.entity.User;
import com.picknpay.entity.UserRole;
import com.picknpay.repository.UserRepository;
import com.picknpay.repository.SaleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class UserService {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private SaleRepository saleRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;


    public List<UserDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public Optional<UserDTO> getUserById(Long id) {
        return userRepository.findById(id)
                .map(this::convertToDTO);
    }

    public Optional<UserDTO> getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .map(this::convertToDTO);
    }

    public List<UserDTO> getUsersByRole(UserRole role) {
        return userRepository.findByRole(role).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<UserDTO> getActiveUsers() {
        return userRepository.findByIsActiveTrue().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public UserDTO createUser(UserDTO userDTO) {
        // Check if username already exists
        if (userRepository.existsByUsername(userDTO.getUsername())) {
            throw new RuntimeException("Username already exists: " + userDTO.getUsername());
        }

        // Check if email already exists
        if (userRepository.existsByEmail(userDTO.getEmail())) {
            throw new RuntimeException("Email already exists: " + userDTO.getEmail());
        }

        // Validate password for new users
        if (userDTO.getPassword() == null || userDTO.getPassword().trim().isEmpty()) {
            throw new RuntimeException("Password is required for new users");
        }
        if (userDTO.getPassword().length() < 6) {
            throw new RuntimeException("Password must be at least 6 characters");
        }

        User user = convertToEntity(userDTO);
        // Encode password before saving
        user.setPassword(passwordEncoder.encode(userDTO.getPassword()));
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        User savedUser = userRepository.save(user);
        return convertToDTO(savedUser);
    }

    public Optional<UserDTO> updateUser(Long id, UserDTO userDTO) {
        return userRepository.findById(id)
                .map(existingUser -> {
                    // Check if username is being changed and if it already exists
                    if (!existingUser.getUsername().equals(userDTO.getUsername()) && 
                        userRepository.existsByUsername(userDTO.getUsername())) {
                        throw new RuntimeException("Username already exists: " + userDTO.getUsername());
                    }

                    // Check if email is being changed and if it already exists
                    if (!existingUser.getEmail().equals(userDTO.getEmail()) && 
                        userRepository.existsByEmail(userDTO.getEmail())) {
                        throw new RuntimeException("Email already exists: " + userDTO.getEmail());
                    }

                    existingUser.setUsername(userDTO.getUsername());
                    existingUser.setEmail(userDTO.getEmail());
                    // Only encode password if it's provided and not already encoded
                    if (userDTO.getPassword() != null && !userDTO.getPassword().isEmpty()) {
                        existingUser.setPassword(passwordEncoder.encode(userDTO.getPassword()));
                    }
                    existingUser.setFullName(userDTO.getFullName());
                    existingUser.setRole(userDTO.getRole());
                    existingUser.setIsActive(userDTO.getIsActive());
                    existingUser.setHourlyPayRate(userDTO.getHourlyPayRate());
                    existingUser.setUpdatedAt(LocalDateTime.now());
                    return convertToDTO(userRepository.save(existingUser));
                });
    }

    public boolean deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            return false;
        }
        
        // Check if user has any sales - cannot delete user with sales history
        if (saleRepository.existsByUserId(id)) {
            throw new RuntimeException("Cannot delete user: User has sales records. Please deactivate the user instead.");
        }
        
            userRepository.deleteById(id);
            return true;
    }

    public Optional<UserDTO> toggleUserStatus(Long id) {
        return userRepository.findById(id)
                .map(user -> {
                    user.setIsActive(!user.getIsActive());
                    user.setUpdatedAt(LocalDateTime.now());
                    return convertToDTO(userRepository.save(user));
                });
    }

    public boolean changePassword(Long userId, String oldPassword, String newPassword) {
        return userRepository.findById(userId)
                .map(user -> {
                    // Verify old password
                    if (passwordEncoder.matches(oldPassword, user.getPassword())) {
                        // Encode and set new password
                        user.setPassword(passwordEncoder.encode(newPassword));
                        user.setUpdatedAt(LocalDateTime.now());
                        userRepository.save(user);
                        return true;
                    }
                    return false;
                })
                .orElse(false);
    }

    public void initializeDefaultUsers() {
        // Create default admin user if no users exist
        if (userRepository.count() == 0) {
            User adminUser = new User("admin", "admin@picknpay.com", passwordEncoder.encode("admin123"), "System Administrator", UserRole.ADMIN);
            adminUser.setCreatedAt(LocalDateTime.now());
            adminUser.setUpdatedAt(LocalDateTime.now());
            userRepository.save(adminUser);
        }
    }

    private UserDTO convertToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setPassword(user.getPassword());
        dto.setFullName(user.getFullName());
        dto.setRole(user.getRole());
        dto.setIsActive(user.getIsActive());
        dto.setHourlyPayRate(user.getHourlyPayRate());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setUpdatedAt(user.getUpdatedAt());
        return dto;
    }

    private User convertToEntity(UserDTO userDTO) {
        User user = new User();
        user.setId(userDTO.getId());
        user.setUsername(userDTO.getUsername());
        user.setEmail(userDTO.getEmail());
        // Password encoding is handled in createUser/updateUser methods
        user.setPassword(userDTO.getPassword());
        user.setFullName(userDTO.getFullName());
        user.setRole(userDTO.getRole());
        user.setIsActive(userDTO.getIsActive());
        user.setHourlyPayRate(userDTO.getHourlyPayRate());
        user.setCreatedAt(userDTO.getCreatedAt());
        user.setUpdatedAt(userDTO.getUpdatedAt());
        return user;
    }
}

