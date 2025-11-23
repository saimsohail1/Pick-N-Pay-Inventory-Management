package com.picknpay.repository;

import com.picknpay.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    
    // Find attendance by user ID and date
    Optional<Attendance> findByUserIdAndAttendanceDate(Long userId, LocalDate attendanceDate);
    
    // Find all attendances by user ID ordered by date descending
    List<Attendance> findByUserIdOrderByAttendanceDateDesc(Long userId);
    
    // Find attendances by user ID and date range
    @Query("SELECT a FROM Attendance a WHERE a.user.id = :userId AND a.attendanceDate BETWEEN :startDate AND :endDate ORDER BY a.attendanceDate DESC")
    List<Attendance> findByUserIdAndAttendanceDateBetween(
        @Param("userId") Long userId, 
        @Param("startDate") LocalDate startDate, 
        @Param("endDate") LocalDate endDate
    );
    
    // Find all attendances by date range (admin only)
    @Query("SELECT a FROM Attendance a WHERE a.attendanceDate BETWEEN :startDate AND :endDate ORDER BY a.attendanceDate DESC, a.user.fullName ASC")
    List<Attendance> findByAttendanceDateBetween(
        @Param("startDate") LocalDate startDate, 
        @Param("endDate") LocalDate endDate
    );
    
    // Find attendances by specific date (for daily view)
    @Query("SELECT a FROM Attendance a WHERE a.attendanceDate = :date ORDER BY a.user.fullName ASC")
    List<Attendance> findByAttendanceDate(@Param("date") LocalDate date);
    
    // Check if attendance exists for user and date
    boolean existsByUserIdAndAttendanceDate(Long userId, LocalDate attendanceDate);
    
    // Get weekly total hours for a user (sum of total_hours for the week)
    @Query("SELECT COALESCE(SUM(a.totalHours), 0) FROM Attendance a WHERE a.user.id = :userId AND a.attendanceDate BETWEEN :weekStart AND :weekEnd")
    BigDecimal getWeeklyTotalHours(
        @Param("userId") Long userId, 
        @Param("weekStart") LocalDate weekStart, 
        @Param("weekEnd") LocalDate weekEnd
    );
    
    // Get all users' weekly total hours (admin only)
    @Query("SELECT a.user.id, a.user.fullName, COALESCE(SUM(a.totalHours), 0) as totalHours " +
           "FROM Attendance a WHERE a.attendanceDate BETWEEN :weekStart AND :weekEnd " +
           "GROUP BY a.user.id, a.user.fullName " +
           "ORDER BY a.user.fullName ASC")
    List<Object[]> getAllUsersWeeklyTotalHours(
        @Param("weekStart") LocalDate weekStart, 
        @Param("weekEnd") LocalDate weekEnd
    );
}

