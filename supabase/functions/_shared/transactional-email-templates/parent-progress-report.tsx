import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "طالب مكين"

interface ParentReportProps {
  studentName?: string
  parentName?: string
  overallPercent?: number
  avgScore?: number
  completedLessons?: number
  totalLessons?: number
  subjectsCount?: number
  certificatesCount?: number
  subjects?: Array<{
    name: string
    completionPercent: number
    avgScore: number
    completedLessons: number
    totalLessons: number
  }>
}

const ParentProgressReportEmail = ({
  studentName = 'الطالب',
  parentName,
  overallPercent = 0,
  avgScore = 0,
  completedLessons = 0,
  totalLessons = 0,
  subjectsCount = 0,
  certificatesCount = 0,
  subjects = [],
}: ParentReportProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>تقرير تقدم {studentName} الدراسي في {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logo}>{SITE_NAME}</Heading>
          <Text style={headerSub}>تقرير تقدم الطالب</Text>
        </Section>

        <Heading style={h1}>
          {parentName ? `مرحباً ${parentName} 👋` : 'مرحباً ولي الأمر 👋'}
        </Heading>

        <Text style={text}>
          نود إطلاعك على تقرير تقدم {studentName ? `ابنك/ابنتك ${studentName}` : 'ابنك/ابنتك'} في منصة {SITE_NAME} التعليمية:
        </Text>

        {/* Stats Grid */}
        <Section style={statsGrid}>
          <table width="100%" cellPadding="0" cellSpacing="0">
            <tr>
              <td style={statCard} width="50%">
                <Text style={statValue}>{overallPercent}%</Text>
                <Text style={statLabel}>نسبة الإكمال</Text>
              </td>
              <td style={statCard} width="50%">
                <Text style={{...statValue, color: avgScore >= 80 ? '#059669' : avgScore >= 50 ? '#d97706' : '#dc2626'}}>{avgScore > 0 ? `${avgScore}%` : '—'}</Text>
                <Text style={statLabel}>معدل الاختبارات</Text>
              </td>
            </tr>
            <tr>
              <td style={statCard} width="50%">
                <Text style={statValue}>{completedLessons}/{totalLessons}</Text>
                <Text style={statLabel}>الدروس المكتملة</Text>
              </td>
              <td style={statCard} width="50%">
                <Text style={statValue}>{certificatesCount}</Text>
                <Text style={statLabel}>الشهادات</Text>
              </td>
            </tr>
          </table>
        </Section>

        {/* Subject details */}
        {subjects.length > 0 && (
          <>
            <Hr style={hr} />
            <Text style={{...text, fontWeight: 'bold' as const, fontSize: '16px', color: '#1a2b3c'}}>
              📊 تفاصيل المواد ({subjectsCount} مادة)
            </Text>
            {subjects.slice(0, 8).map((sub, i) => (
              <Section key={i} style={subjectRow}>
                <Text style={subjectName}>{sub.name}</Text>
                <Text style={subjectStats}>
                  إكمال: {sub.completionPercent}% | معدل: {sub.avgScore > 0 ? `${sub.avgScore}%` : '—'} | {sub.completedLessons}/{sub.totalLessons} درس
                </Text>
              </Section>
            ))}
          </>
        )}

        <Hr style={hr} />

        <Text style={footer}>
          تم إرسال هذا التقرير بواسطة {studentName} عبر منصة {SITE_NAME}.
        </Text>
        <Text style={footer}>
          مع أطيب التحيات، فريق {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ParentProgressReportEmail,
  subject: (data: Record<string, any>) =>
    `تقرير تقدم ${data.studentName || 'الطالب'} الدراسي — ${SITE_NAME}`,
  displayName: 'Parent Progress Report',
  previewData: {
    studentName: 'أحمد',
    parentName: 'محمد',
    overallPercent: 72,
    avgScore: 85,
    completedLessons: 18,
    totalLessons: 25,
    subjectsCount: 3,
    certificatesCount: 1,
    subjects: [
      { name: 'الرياضيات', completionPercent: 90, avgScore: 88, completedLessons: 9, totalLessons: 10 },
      { name: 'العلوم', completionPercent: 60, avgScore: 75, completedLessons: 6, totalLessons: 10 },
      { name: 'اللغة العربية', completionPercent: 60, avgScore: 92, completedLessons: 3, totalLessons: 5 },
    ],
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
}

const container = {
  padding: '0',
  maxWidth: '560px',
  margin: '0 auto',
}

const headerSection = {
  backgroundColor: '#0d7268',
  borderRadius: '12px 12px 0 0',
  padding: '24px',
  textAlign: 'center' as const,
}

const logo = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: 'bold' as const,
  margin: '0',
}

const headerSub = {
  color: 'rgba(255,255,255,0.8)',
  fontSize: '14px',
  margin: '8px 0 0',
}

const h1 = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: '#1a2b3c',
  margin: '24px 24px 16px',
  textAlign: 'right' as const,
}

const text = {
  fontSize: '15px',
  color: '#55575d',
  lineHeight: '1.7',
  margin: '0 24px 16px',
  textAlign: 'right' as const,
}

const statsGrid = {
  padding: '0 16px',
  margin: '8px 0',
}

const statCard = {
  backgroundColor: '#f0fdfa',
  borderRadius: '10px',
  padding: '16px 12px',
  textAlign: 'center' as const,
  border: '1px solid #e0f2f1',
  margin: '4px',
}

const statValue = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0d7268',
  margin: '0',
  textAlign: 'center' as const,
}

const statLabel = {
  fontSize: '12px',
  color: '#888',
  margin: '4px 0 0',
  textAlign: 'center' as const,
}

const subjectRow = {
  backgroundColor: '#fafafa',
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '0 24px 8px',
  border: '1px solid #f0f0f0',
}

const subjectName = {
  fontSize: '14px',
  fontWeight: 'bold' as const,
  color: '#1a2b3c',
  margin: '0 0 4px',
  textAlign: 'right' as const,
}

const subjectStats = {
  fontSize: '12px',
  color: '#888',
  margin: '0',
  textAlign: 'right' as const,
}

const hr = {
  borderColor: '#e5e5e5',
  margin: '24px',
}

const footer = {
  fontSize: '12px',
  color: '#999999',
  margin: '0 24px 8px',
  textAlign: 'right' as const,
}
