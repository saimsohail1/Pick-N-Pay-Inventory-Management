package com.picknpay.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "attendances")
public class Attendance {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotNull(message = "User is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @NotNull(message = "Attendance date is required")
    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;
    
    @NotNull(message = "Time in is required")
    @Column(name = "time_in", nullable = false)
    private LocalTime timeIn;
    
    @Column(name = "time_out")
    private LocalTime timeOut; // NULL if still clocked in
    
    @Column(name = "total_hours", precision = 5, scale = 2)
    private BigDecimal totalHours; // Calculated: time_out - time_in (in hours)
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        calculateTotalHours();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        calculateTotalHours();
    }
    
    // Calculate total hours when timeOut is set
    private void calculateTotalHours() {
        if (timeIn != null && timeOut != null) {
            long minutes = java.time.Duration.between(timeIn, timeOut).toMinutes();
            double hours = minutes / 60.0;
            this.totalHours = BigDecimal.valueOf(hours).setScale(2, java.math.RoundingMode.HALF_UP);
        } else {
            this.totalHours = null;
        }
    }
    
    // Constructors
    public Attendance() {
    }
    
    public Attendance(User user, LocalDate attendanceDate, LocalTime timeIn) {
        this.user = user;
        this.attendanceDate = attendanceDate;
        this.timeIn = timeIn;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public User getUser() {
        return user;
    }
    
    public void setUser(User user) {
        this.user = user;
    }
    
    public LocalDate getAttendanceDate() {
        return attendanceDate;
    }
    
    public void setAttendanceDate(LocalDate attendanceDate) {
        this.attendanceDate = attendanceDate;
    }
    
    public LocalTime getTimeIn() {
        return timeIn;
    }
    
    public void setTimeIn(LocalTime timeIn) {
        this.timeIn = timeIn;
        calculateTotalHours();
    }
    
    public LocalTime getTimeOut() {
        return timeOut;
    }
    
    public void setTimeOut(LocalTime timeOut) {
        this.timeOut = timeOut;
        calculateTotalHours();
    }
    
    public BigDecimal getTotalHours() {
        return totalHours;
    }
    
    public void setTotalHours(BigDecimal totalHours) {
        this.totalHours = totalHours;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}

