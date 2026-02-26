package com.example.ocenv.web;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import java.util.regex.Pattern;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.example.ocenv.dto.VisitorRegisterRequest;
import com.example.ocenv.model.Visit;
import com.example.ocenv.model.Visitor;
import com.example.ocenv.repository.VisitRepository;
import com.example.ocenv.repository.VisitorRepository;

@RestController
@RequestMapping("/visitor")
public class VisitorController {

    private static final Pattern OCC_ID = Pattern.compile("^C\\d{8}$");

    private final VisitorRepository visitorRepo;
    private final VisitRepository visitRepo;
    private final ZoneId zone = ZoneId.of("America/Los_Angeles");

    public VisitorController(VisitorRepository visitorRepo, VisitRepository visitRepo) {
        this.visitorRepo = visitorRepo;
        this.visitRepo = visitRepo;
    }

    @PostMapping("/register")
    @Transactional
    public ResponseEntity<?> register(@RequestBody VisitorRegisterRequest req, HttpServletRequest http) {
        String name = (req.getName() == null) ? "" : req.getName().trim();
        if (name.isEmpty()) name = "Unknown";

        String occId = (req.getOccStudentId() == null) ? "" : req.getOccStudentId().trim().toUpperCase();
        if (!occId.isEmpty() && !OCC_ID.matcher(occId).matches()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid OCC student id format"));
        }

        boolean isStudent = !occId.isEmpty();
        String role = isStudent ? "OCC_STUDENT" : "GUEST";

        Visitor visitor;
        if (isStudent) {
            // Unique visitor: OCC student id is stable
            visitor = visitorRepo.findByOccStudentId(occId).orElseGet(Visitor::new);
            visitor.setOccStudentId(occId);
        } else {
            // Guests have no stable unique key: each guest login becomes a new visitor
            visitor = new Visitor();
            visitor.setOccStudentId(null);
        }

        visitor.setName(name);
        visitor.setRole(role);
        visitor.setLastSeen(Instant.now());
        visitor = visitorRepo.save(visitor);

        // Every login => a Visit row
        Visit visit = new Visit();
        visit.setVisitor(visitor);
        visitRepo.save(visit);

        // Session gate
        HttpSession session = http.getSession(true);
        session.setAttribute("visitorId", visitor.getId());

        // Return snapshot so UI updates immediately
        return ResponseEntity.ok(buildDashboardSnapshot());
    }

    private Map<String, Object> buildDashboardSnapshot() {
        long totalVisits = visitRepo.count();
        long totalVisitors = visitorRepo.count();
        long totalGuests = visitorRepo.countByRole("GUEST");
        long totalOccStudents = visitorRepo.countByRole("OCC_STUDENT");

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
                "todayVisits", todayVisits,
                "todayVisitors", todayVisitors,
                "todayGuests", todayGuests,
                "todayOccStudents", todayOcc
        );
    }
}