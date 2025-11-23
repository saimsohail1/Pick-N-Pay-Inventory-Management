package com.picknpay.controller;

import com.picknpay.dto.AttendanceDTO;
import com.picknpay.service.AttendanceService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/attendances")
@CrossOrigin(origins = "*")
public class AttendanceController {
    
    @Autowired
    private AttendanceService attendanceService;
    
    /**
     * Mark time-in for a user
     * POST /api/attendances/time-in
     * Body: { "userId": 1, "date": "2024-01-15", "timeIn": "09:00:00" }
     */
    @PostMapping("/time-in")
    public ResponseEntity<?> markTimeIn(@Valid @RequestBody Map<String, Object> request) {
        try {
            Long userId = Long.valueOf(request.get("userId").toString());
            LocalDate date = LocalDate.parse(request.get("date").toString());
            LocalTime timeIn = LocalTime.parse(request.get("timeIn").toString());
            
            AttendanceDTO attendance = attendanceService.markTimeIn(userId, date, timeIn);
            return ResponseEntity.status(HttpStatus.CREATED).body(attendance);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body("Error marking time-in: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Unexpected error: " + e.getMessage());
        }
    }
    
    /**
     * Mark time-out for a user
     * POST /api/attendances/time-out
     * Body: { "userId": 1, "date": "2024-01-15", "timeOut": "17:00:00" }
     */
    @PostMapping("/time-out")
    public ResponseEntity<?> markTimeOut(@Valid @RequestBody Map<String, Object> request) {
        try {
            Long userId = Long.valueOf(request.get("userId").toString());
            LocalDate date = LocalDate.parse(request.get("date").toString());
            LocalTime timeOut = LocalTime.parse(request.get("timeOut").toString());
            
            AttendanceDTO attendance = attendanceService.markTimeOut(userId, date, timeOut);
            return ResponseEntity.ok(attendance);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body("Error marking time-out: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Unexpected error: " + e.getMessage());
        }
    }
    
    /**
     * Get attendance for a user on a specific date
     * GET /api/attendances/user/{userId}/date/{date}
     */
    @GetMapping("/user/{userId}/date/{date}")
    public ResponseEntity<AttendanceDTO> getAttendanceByUserAndDate(
            @PathVariable Long userId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        Optional<AttendanceDTO> attendance = attendanceService.getAttendanceByUserAndDate(userId, date);
        return attendance.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    /**
     * Get all attendances for a user in a date range
     * GET /api/attendances/user/{userId}/date-range?startDate=2024-01-01&endDate=2024-01-31
     */
    @GetMapping("/user/{userId}/date-range")
    public ResponseEntity<List<AttendanceDTO>> getAttendanceByUserAndDateRange(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<AttendanceDTO> attendances = attendanceService.getAttendanceByUserAndDateRange(userId, startDate, endDate);
        return ResponseEntity.ok(attendances);
    }
    
    /**
     * Get all attendances for a specific date (admin only)
     * GET /api/attendances/date/{date}
     */
    @GetMapping("/date/{date}")
    public ResponseEntity<List<AttendanceDTO>> getAttendanceByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<AttendanceDTO> attendances = attendanceService.getAttendanceByDate(date);
        return ResponseEntity.ok(attendances);
    }
    
    /**
     * Get all attendances in a date range (admin only)
     * GET /api/attendances/date-range?startDate=2024-01-01&endDate=2024-01-31
     */
    @GetMapping("/date-range")
    public ResponseEntity<List<AttendanceDTO>> getAllAttendanceByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<AttendanceDTO> attendances = attendanceService.getAllAttendanceByDateRange(startDate, endDate);
        return ResponseEntity.ok(attendances);
    }
    
    /**
     * Get weekly report for a specific user
     * GET /api/attendances/weekly-report/user/{userId}?weekStart=2024-01-15
     */
    @GetMapping("/weekly-report/user/{userId}")
    public ResponseEntity<Map<String, Object>> getWeeklyReportForUser(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        java.math.BigDecimal totalHours = attendanceService.getWeeklyTotalHours(userId, weekStart);
        return ResponseEntity.ok(Map.of(
            "userId", userId,
            "weekStart", weekStart.toString(),
            "totalHours", totalHours
        ));
    }
    
    /**
     * Get weekly report for all users (admin only)
     * GET /api/attendances/weekly-report?weekStart=2024-01-15
     */
    @GetMapping("/weekly-report")
    public ResponseEntity<List<AttendanceService.WeeklyReportDTO>> getAllUsersWeeklyReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        List<AttendanceService.WeeklyReportDTO> report = attendanceService.getAllUsersWeeklyReport(weekStart);
        return ResponseEntity.ok(report);
    }
    
    /**
     * Get week start (Monday) for a given date
     * GET /api/attendances/week-start?date=2024-01-15
     */
    @GetMapping("/week-start")
    public ResponseEntity<Map<String, String>> getWeekStart(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate weekStart = attendanceService.getWeekStart(date);
        return ResponseEntity.ok(Map.of("weekStart", weekStart.toString()));
    }
}

