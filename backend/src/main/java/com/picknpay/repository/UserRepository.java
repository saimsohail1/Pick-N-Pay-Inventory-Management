package com.picknpay.repository;

import com.picknpay.entity.User;
import com.picknpay.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    // Find user by username
    Optional<User> findByUsername(String username);
    
    // Find user by email
    Optional<User> findByEmail(String email);
    
    // Find users by role
    List<User> findByRole(UserRole role);
    
    // Find active users
    List<User> findByIsActiveTrue();
    
    // Find inactive users
    List<User> findByIsActiveFalse();
    
    // Check if username exists
    boolean existsByUsername(String username);
    
    // Check if email exists
    boolean existsByEmail(String email);
}
