package com.example.ocenv.model;

import java.time.Instant;

import jakarta.persistence.*;

@Entity
@Table(
        name = "visitors",
        uniqueConstraints = @UniqueConstraint(name = "uk_visitors_occ_id", columnNames = "occ_student_id")
)
public class Visitor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "occ_student_id", length = 9, unique = true)
    private String occStudentId;

    @Column(nullable = false, length = 20)
    private String role;

    @Column(name = "first_seen", nullable = false)
    private Instant firstSeen;

    @Column(name = "last_seen", nullable = false)
    private Instant lastSeen;

    // ---- QUIZ FIELDS ----
    @Column(name = "quiz_completed", nullable = false)
    private boolean quizCompleted = false;

    @Column(name = "quiz_best_score", nullable = false)
    private int quizBestScore = 0;

    @Column(name = "quiz_best_at")
    private Instant quizBestAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (firstSeen == null) firstSeen = now;
        if (lastSeen == null) lastSeen = now;
    }

    @PreUpdate
    void preUpdate() {
        if (lastSeen == null) lastSeen = Instant.now();
    }

    public Long getId() { return id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getOccStudentId() { return occStudentId; }
    public void setOccStudentId(String occStudentId) { this.occStudentId = occStudentId; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public Instant getFirstSeen() { return firstSeen; }
    public void setFirstSeen(Instant firstSeen) { this.firstSeen = firstSeen; }

    public Instant getLastSeen() { return lastSeen; }
    public void setLastSeen(Instant lastSeen) { this.lastSeen = lastSeen; }

    public boolean isQuizCompleted() { return quizCompleted; }
    public void setQuizCompleted(boolean quizCompleted) { this.quizCompleted = quizCompleted; }

    public int getQuizBestScore() { return quizBestScore; }
    public void setQuizBestScore(int quizBestScore) { this.quizBestScore = quizBestScore; }

    public Instant getQuizBestAt() { return quizBestAt; }
    public void setQuizBestAt(Instant quizBestAt) { this.quizBestAt = quizBestAt; }
}