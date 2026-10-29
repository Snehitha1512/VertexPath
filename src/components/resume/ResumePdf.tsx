import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
} from "@react-pdf/renderer";
import type { ResumeContent } from "@/lib/resume/types";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    lineHeight: 1.35,
    color: "#1e293b",
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    borderBottomStyle: "solid",
    paddingBottom: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  name: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginBottom: 3,
    color: "#0f172a",
  },
  targetRole: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0f766e",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    fontSize: 8.5,
    color: "#475569",
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottomWidth: 0.75,
    borderBottomColor: "#e2e8f0",
    borderBottomStyle: "solid",
    paddingBottom: 2,
    marginBottom: 5,
    color: "#0f172a",
  },
  summaryText: {
    fontSize: 9,
    color: "#334155",
    lineHeight: 1.4,
    textAlign: "justify",
  },
  skillsText: {
    fontSize: 9,
    color: "#334155",
  },
  itemBlock: {
    marginBottom: 6,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 2,
  },
  itemTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    color: "#0f172a",
  },
  itemSubtitle: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#475569",
  },
  itemDate: {
    fontSize: 8.5,
    color: "#64748b",
  },
  itemUrl: {
    fontSize: 8,
    color: "#0f766e",
    marginBottom: 2,
  },
  bulletList: {
    paddingLeft: 12,
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 2,
  },
  bulletPoint: {
    width: 8,
    fontSize: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 8.8,
    color: "#334155",
    lineHeight: 1.3,
  },
});

interface ResumePdfProps {
  content: ResumeContent;
  profile: any;
  targetRole: string;
}

export const ResumePdfDocument: React.FC<ResumePdfProps> = ({
  content,
  profile,
  targetRole,
}) => {
  const fullName = profile?.full_name || "Your Name";
  const email = profile?.email || "";
  const phone = profile?.phone || "";
  const location = profile?.location || "";
  const linkedinUrl = profile?.linkedin_url || "";
  const githubUrl = profile?.github_url || "";
  const portfolioUrl = profile?.portfolio_url || "";

  return (
    <Document title={`${fullName} - ${targetRole} Resume`}>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.name}>{fullName}</Text>
          {targetRole ? <Text style={styles.targetRole}>{targetRole}</Text> : null}

          <View style={styles.contactRow}>
            {email ? <Text>{email}</Text> : null}
            {phone ? <Text>• {phone}</Text> : null}
            {location ? <Text>• {location}</Text> : null}
            {linkedinUrl ? <Text>• LinkedIn: {linkedinUrl}</Text> : null}
            {githubUrl ? <Text>• GitHub: {githubUrl}</Text> : null}
            {portfolioUrl ? <Text>• Portfolio: {portfolioUrl}</Text> : null}
          </View>
        </View>

        {/* SUMMARY */}
        {content.summary ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Summary</Text>
            <Text style={styles.summaryText}>{content.summary}</Text>
          </View>
        ) : null}

        {/* SKILLS */}
        {content.skills && content.skills.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills & Competencies</Text>
            <Text style={styles.skillsText}>{content.skills.join(" • ")}</Text>
          </View>
        ) : null}

        {/* PROJECTS */}
        {content.projects && content.projects.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Projects</Text>
            {content.projects.map((proj, idx) => (
              <View key={idx} style={styles.itemBlock} wrap={false}>
                <View style={styles.itemHeader}>
                  <Text>
                    <Text style={styles.itemTitle}>{proj.title}</Text>
                    {proj.subtitle ? (
                      <Text style={styles.itemSubtitle}> | {proj.subtitle}</Text>
                    ) : null}
                  </Text>
                  {proj.date ? <Text style={styles.itemDate}>{proj.date}</Text> : null}
                </View>

                {proj.url ? <Text style={styles.itemUrl}>{proj.url}</Text> : null}

                {proj.bullets && proj.bullets.length > 0 ? (
                  <View style={styles.bulletList}>
                    {proj.bullets.map((b, bIdx) => (
                      <View key={bIdx} style={styles.bulletItem}>
                        <Text style={styles.bulletPoint}>•</Text>
                        <Text style={styles.bulletText}>{b}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* CERTIFICATIONS */}
        {content.certifications && content.certifications.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications & Training</Text>
            {content.certifications.map((cert, idx) => (
              <View key={idx} style={styles.itemHeader} wrap={false}>
                <Text>
                  <Text style={styles.itemTitle}>{cert.title}</Text>
                  {cert.subtitle ? (
                    <Text style={styles.itemSubtitle}> — {cert.subtitle}</Text>
                  ) : null}
                </Text>
                {cert.date ? <Text style={styles.itemDate}>{cert.date}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* EDUCATION */}
        {profile?.education_level || profile?.college_or_company ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            <View style={styles.itemHeader}>
              <Text>
                <Text style={styles.itemTitle}>
                  {profile.education_detail || profile.education_level || "Degree"}
                </Text>
                {profile.college_or_company ? (
                  <Text style={styles.itemSubtitle}> — {profile.college_or_company}</Text>
                ) : null}
              </Text>
            </View>
          </View>
        ) : null}
      </Page>
    </Document>
  );
};

