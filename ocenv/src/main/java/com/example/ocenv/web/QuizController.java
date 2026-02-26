package com.example.ocenv.web;

import java.time.Instant;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.example.ocenv.dto.QuizSubmitRequest;
import com.example.ocenv.model.Visitor;
import com.example.ocenv.repository.VisitorRepository;

@RestController
@RequestMapping("/api/quiz")
public class QuizController {

    private final VisitorRepository visitorRepo;

    public QuizController(VisitorRepository visitorRepo) {
        this.visitorRepo = visitorRepo;
    }

    @PostMapping("/submit")
    @Transactional
    public ResponseEntity<?> submit(@RequestBody QuizSubmitRequest req, HttpServletRequest http) {
        int score = req.getScore();
        int total = req.getTotal();

        if (total <= 0 || total > 50) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid total"));
        }
        if (score < 0 || score > total) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid score"));
        }

        HttpSession session = http.getSession(false);
        Object visitorIdObj = (session == null) ? null : session.getAttribute("visitorId");
        if (visitorIdObj == null) {
            return ResponseEntity.status(401).body(Map.of("error", "No visitor session"));
        }

        Long visitorId = (visitorIdObj instanceof Long)
                ? (Long) visitorIdObj
                : Long.valueOf(visitorIdObj.toString());

        Visitor v = visitorRepo.findById(visitorId)
                .orElseThrow(() -> new IllegalStateException("Visitor not found"));

        v.setQuizCompleted(true);

        boolean improved = false;
        if (score > v.getQuizBestScore()) {
            v.setQuizBestScore(score);
            v.setQuizBestAt(Instant.now());
            improved = true;
        }

        visitorRepo.save(v);

        boolean perfect = (score == total);

        return ResponseEntity.ok(Map.of(
                "score", score,
                "total", total,
                "bestScore", v.getQuizBestScore(),
                "improved", improved,
                "perfect", perfect
        ));
    }
}