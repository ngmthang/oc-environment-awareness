package com.example.ocenv.repository;

import java.time.Instant;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.ocenv.model.Visit;

public interface VisitRepository extends JpaRepository<Visit, Long> {

    long countByCreatedAtBetween(Instant startInclusive, Instant endExclusive);

    @Query("select count(distinct v.visitor.id) from Visit v where v.createdAt >= :start and v.createdAt < :end")
    long countDistinctVisitorsBetween(@Param("start") Instant start, @Param("end") Instant end);

    @Query("""
           select count(distinct v.visitor.id)
           from Visit v
           where v.createdAt >= :start and v.createdAt < :end
             and v.visitor.role = :role
           """)
    long countDistinctVisitorsByRoleBetween(@Param("role") String role,
                                            @Param("start") Instant start,
                                            @Param("end") Instant end);
}