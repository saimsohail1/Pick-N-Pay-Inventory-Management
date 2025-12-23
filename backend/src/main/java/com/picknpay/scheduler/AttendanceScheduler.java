package com.picknpay.scheduler;

import com.picknpay.service.AttendanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class AttendanceScheduler {
    
    @Autowired
    private AttendanceService attendanceService;
    
    /**
     * Automatically mark time-out for all open attendances at 11:59 PM every day
     * Cron expression: second minute hour day month day-of-week
     * 0 59 23 * * * = Every day at 23:59:00 (11:59 PM)
     */
    @Scheduled(cron = "0 59 23 * * *")
    public void autoTimeOutAtEndOfDay() {
        try {
            attendanceService.autoTimeOutAtEndOfDay();
        } catch (Exception e) {
            System.err.println("Error in auto time-out scheduler: " + e.getMessage());
            e.printStackTrace();
        }
    }
}

