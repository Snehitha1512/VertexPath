import { describe, it, expect } from "vitest";
import {
  calculateProjectScore,
  calculateCertificationScore,
  extractJdKeywords,
} from "../ranking";

describe("Resume Ranking System", () => {
  it("ranks Cybersecurity project higher than Frontend project for Cybersecurity role", () => {
    const cyberProject = {
      title: "Malware Detection and Threat Analysis Tool",
      description: "Implemented a SIEM vulnerability scanner using Python and Wireshark for network security incident response.",
      technologies: ["Python", "Wireshark", "Linux", "Metasploit"],
      start_date: "2024-01-01",
    };

    const frontendProject = {
      title: "Interactive E-Commerce Web App",
      description: "Built a responsive frontend web application with React, Tailwind CSS, and state management.",
      technologies: ["React", "Tailwind", "JavaScript", "HTML"],
      start_date: "2024-01-01",
    };

    const cyberScore = calculateProjectScore(cyberProject, "Cybersecurity Analyst");
    const frontendScore = calculateProjectScore(frontendProject, "Cybersecurity Analyst");

    expect(cyberScore.score).toBeGreaterThan(frontendScore.score);
    expect(cyberScore.band).toBe("High");
    expect(cyberScore.matched).toContain("python");
    expect(cyberScore.matched).toContain("wireshark");
  });

  it("boosts project score when JD terms match project details", () => {
    const project = {
      title: "Distributed Payment Gateway",
      description: "Engineered a fault-tolerant microservice architecture handling payment transactions.",
      technologies: ["Golang", "PostgreSQL", "Kafka"],
      start_date: "2023-06-01",
    };

    const baseline = calculateProjectScore(project, "Backend Developer", "");
    const withJd = calculateProjectScore(
      project,
      "Backend Developer",
      "Looking for Backend Engineer with Kafka streaming and PostgreSQL high-availability payment transaction experience."
    );

    expect(withJd.score).toBeGreaterThanOrEqual(baseline.score);
    expect(withJd.matched).toContain("kafka");
  });

  it("ensures an expired certification does not outrank a valid active certification", () => {
    const validCert = {
      name: "AWS Certified Solutions Architect",
      issuer: "Amazon Web Services",
      issue_date: "2024-01-01",
      expiry_date: "2027-01-01",
      skills: ["AWS", "Cloud Architecture"],
    };

    const expiredCert = {
      name: "AWS Certified Solutions Architect",
      issuer: "Amazon Web Services",
      issue_date: "2019-01-01",
      expiry_date: "2022-01-01", // expired
      skills: ["AWS", "Cloud Architecture"],
    };

    const validScore = calculateCertificationScore(validCert, "Cloud/DevOps Engineer");
    const expiredScore = calculateCertificationScore(expiredCert, "Cloud/DevOps Engineer");

    expect(validScore.score).toBeGreaterThan(expiredScore.score);
  });

  it("extracts meaningful keywords from pasted Job Description text", () => {
    const jd = "We are seeking a Full-Stack React and Node.js Developer who loves Docker, TypeScript, and microservices architecture.";
    const keywords = extractJdKeywords(jd);

    expect(keywords).toContain("react");
    expect(keywords).toContain("node.js");
    expect(keywords).toContain("docker");
    expect(keywords).toContain("typescript");
    expect(keywords).not.toContain("and");
    expect(keywords).not.toContain("who");
  });
});

