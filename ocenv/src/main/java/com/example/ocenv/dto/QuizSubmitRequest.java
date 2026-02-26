package com.example.ocenv.dto;

public class QuizSubmitRequest {
    private int score;
    private int total;

    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }

    public int getTotal() { return total; }
    public void setTotal(int total) { this.total = total; }
}