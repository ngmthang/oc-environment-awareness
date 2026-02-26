package com.example.ocenv.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.ocenv.model.Visitor;

public interface VisitorRepository extends JpaRepository<Visitor, Long> {
    Optional<Visitor> findByOccStudentId(String occStudentId);

    long countByRole(String role);

    long countByQuizBestScore(int quizBestScore);

    long countByQuizCompletedTrue();
}