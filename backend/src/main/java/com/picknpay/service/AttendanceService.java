package com.picknpay.service;

import com.picknpay.dto.AttendanceDTO;
import com.picknpay.entity.Attendance;
import com.picknpay.entity.User;
import com.picknpay.repository.AttendanceRepository;
import com.picknpay.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class AttendanceService {
    
    @Autowired
    private AttendanceRepository attendanceRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    /**
     * Mark time-in for a user on a specific date
     * Allows multiple time-in entries per day
     */
    public AttendanceDTO markTimeIn(Long userId, LocalDate date, LocalTime timeIn) {
        // Validate user exists
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));
        
        // Always create a new attendance record for time-in
        Attendance attendance = new Attendance();
        attendance.setUser(user);
        attendance.setAttendanceDate(date);
        attendance.setTimeIn(timeIn);
        attendance = attendanceRepository.save(attendance);
        return convertToDTO(attendance);
    }
    
    /**
     * Mark time-out for a user on a specific date
     * Finds the latest open entry (time-out is null) and marks time-out
     */
    public AttendanceDTO markTimeOut(Long userId, LocalDate date, LocalTime timeOut) {
        // Validate user exists
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));
        
        // Find the latest open attendance (time-out is null)
        Attendance attendance = attendanceRepository.findLatestOpenAttendanceByUserIdAndDate(userId, date)
                .orElseThrow(() -> new RuntimeException("No open time-in found for user " + user.getFullName() + " on " + date));
        
        // Validate time-out is after time-in
        if (attendance.getTimeIn() != null && timeOut.isBefore(attendance.getTimeIn())) {
            throw new RuntimeException("Time-out cannot be before time-in");
        }
        
        attendance.setTimeOut(timeOut);
        attendance = attendanceRepository.save(attendance);
        return convertToDTO(attendance);
    }
    
    /**
     * Get attendance for a user on a specific date (returns first one for backward compatibility)
     */
    public Optional<AttendanceDTO> getAttendanceByUserAndDate(Long userId, LocalDate date) {
        return attendanceRepository.findByUserIdAndAttendanceDate(userId, date)
                .map(this::convertToDTO);
    }
    
    /**
     * Get all attendances for a user on a specific date
     */
    public List<AttendanceDTO> getAllAttendancesByUserAndDate(Long userId, LocalDate date) {
        return attendanceRepository.findAllByUserIdAndAttendanceDate(userId, date).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Automatically mark time-out for all open attendances at 11:59 PM
     * This method is called by a scheduled task
     */
    public void autoTimeOutAtEndOfDay() {
        LocalDate today = LocalDate.now();
        LocalTime endOfDay = LocalTime.of(23, 59, 0);
        
        // Find all open attendances for today
        List<Attendance> openAttendances = attendanceRepository.findByAttendanceDate(today).stream()
                .filter(a -> a.getTimeOut() == null)
                .collect(Collectors.toList());
        
        for (Attendance attendance : openAttendances) {
            attendance.setTimeOut(endOfDay);
            attendanceRepository.save(attendance);
        }
        
        System.out.println("Auto time-out completed for " + openAttendances.size() + " open attendances on " + today);
    }
    
    /**
     * Get all attendances for a user in a date range
     */
    public List<AttendanceDTO> getAttendanceByUserAndDateRange(Long userId, LocalDate startDate, LocalDate endDate) {
        return attendanceRepository.findByUserIdAndAttendanceDateBetween(userId, startDate, endDate).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Get all attendances for a specific date (admin only)
     */
    public List<AttendanceDTO> getAttendanceByDate(LocalDate date) {
        return attendanceRepository.findByAttendanceDate(date).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Get all attendances in a date range (admin only)
     */
    public List<AttendanceDTO> getAllAttendanceByDateRange(LocalDate startDate, LocalDate endDate) {
        return attendanceRepository.findByAttendanceDateBetween(startDate, endDate).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Get weekly report for a specific user
     * Returns total hours worked in the week starting from weekStart
     */
    public BigDecimal getWeeklyTotalHours(Long userId, LocalDate weekStart) {
        LocalDate weekEnd = weekStart.plusDays(6); // End of week (Sunday)
        BigDecimal totalHours = attendanceRepository.getWeeklyTotalHours(userId, weekStart, weekEnd);
        return totalHours != null ? totalHours : BigDecimal.ZERO;
    }
    
    /**
     * Get weekly report for all users (admin only)
     * Returns a list of user IDs, names, and their total hours for the week
     */
    public List<WeeklyReportDTO> getAllUsersWeeklyReport(LocalDate weekStart) {
        LocalDate weekEnd = weekStart.plusDays(6); // End of week (Sunday)
        List<Object[]> results = attendanceRepository.getAllUsersWeeklyTotalHours(weekStart, weekEnd);
        
        return results.stream()
                .map(result -> {
                    WeeklyReportDTO dto = new WeeklyReportDTO();
                    dto.setUserId(((Number) result[0]).longValue());
                    dto.setFullName((String) result[1]);
                    dto.setTotalHours((BigDecimal) result[2]);
                    return dto;
                })
                .collect(Collectors.toList());
    }
    
    /**
     * Get start of week (Monday) for a given date
     */
    public LocalDate getWeekStart(LocalDate date) {
        return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }
    
    /**
     * Convert Attendance entity to DTO
     */
    private AttendanceDTO convertToDTO(Attendance attendance) {
        AttendanceDTO dto = new AttendanceDTO();
        dto.setId(attendance.getId());
        dto.setUserId(attendance.getUser().getId());
        dto.setUsername(attendance.getUser().getUsername());
        dto.setFullName(attendance.getUser().getFullName());
        dto.setAttendanceDate(attendance.getAttendanceDate());
        dto.setTimeIn(attendance.getTimeIn());
        dto.setTimeOut(attendance.getTimeOut());
        dto.setTotalHours(attendance.getTotalHours());
        dto.setCreatedAt(attendance.getCreatedAt());
        dto.setUpdatedAt(attendance.getUpdatedAt());
        return dto;
    }
    
    /**
     * Inner DTO class for weekly report
     */
    public static class WeeklyReportDTO {
        private Long userId;
        private String fullName;
        private BigDecimal totalHours;
        
        public Long getUserId() {
            return userId;
        }
        
        public void setUserId(Long userId) {
            this.userId = userId;
        }
        
        public String getFullName() {
            return fullName;
        }
        
        public void setFullName(String fullName) {
            this.fullName = fullName;
        }
        
        public BigDecimal getTotalHours() {
            return totalHours;
        }
        
        public void setTotalHours(BigDecimal totalHours) {
            this.totalHours = totalHours;
        }
    }
}

