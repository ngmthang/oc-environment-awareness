package com.example.ocenv.dto;

public class VisitorRegisterRequest {
    private String name;
    private String occStudentId; // nullable/blank for guests

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getOccStudentId() { return occStudentId; }
    public void setOccStudentId(String occStudentId) { this.occStudentId = occStudentId; }
}