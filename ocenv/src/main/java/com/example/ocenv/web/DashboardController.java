package com.example.ocenv.web;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.ocenv.repository.VisitRepository;
import com.example.ocenv.repository.VisitorRepository;

@RestController
@RequestMapping("/api")
public class DashboardController {

    private final VisitorRepository visitorRepo;
    private final VisitRepository visitRepo;
    private final ZoneId zone = ZoneId.of("America/Los_Angeles");

    public DashboardController(VisitorRepository visitorRepo, VisitRepository visitRepo) {
        this.visitorRepo = visitorRepo;
        this.visitRepo = visitRepo;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        long totalVisits = visitRepo.count();
        long totalVisitors = visitorRepo.count();
        long totalGuests = visitorRepo.countByRole("GUEST");
        long totalOccStudents = visitorRepo.countByRole("OCC_STUDENT");

        long totalPerfectQuizUsers = visitorRepo.countByQuizBestScore(10);

        LocalDate today = LocalDate.now(zone);
        Instant start = today.atStartOfDay(zone).toInstant();
        Instant end = today.plusDays(1).atStartOfDay(zone).toInstant();

        long todayVisits = visitRepo.countByCreatedAtBetween(start, end);
        long todayVisitors = visitRepo.countDistinctVisitorsBetween(start, end);
        long todayGuests = visitRepo.countDistinctVisitorsByRoleBetween("GUEST", start, end);
        long todayOcc = visitRepo.countDistinctVisitorsByRoleBetween("OCC_STUDENT", start, end);

        return Map.of(
                "totalVisits", totalVisits,
                "totalVisitors", totalVisitors,
                "totalGuests", totalGuests,
                "totalOccStudents", totalOccStudents,
                "totalPerfectQuizUsers", totalPerfectQuizUsers,

                "todayVisits", todayVisits,
                "todayVisitors", todayVisitors,
                "todayGuests", todayGuests,
                "todayOccStudents", todayOcc
        );
    }
}