import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "طالب مكين"

interface SubscriptionActivationProps {
  name?: string
  expiresAt?: string
}

const SubscriptionActivationEmail = ({ name, expiresAt }: SubscriptionActivationProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>تم تفعيل اشتراكك في {SITE_NAME} بنجاح!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logo}>{SITE_NAME}</Heading>
        </Section>

        <Heading style={h1}>
          {name ? `مرحباً ${name}! 🎉` : 'مرحباً! 🎉'}
        </Heading>

        <Text style={text}>
          تم تفعيل اشتراكك بنجاح. يمكنك الآن الوصول لجميع الدروس والمحتوى المدفوع على المنصة.
        </Text>

        {expiresAt && (
          <Text style={text}>
            <strong>صلاحية الاشتراك حتى:</strong> {expiresAt}
          </Text>
        )}

        <Section style={ctaSection}>
          <Button style={button} href="https://studentamkeen.com/grades">
            ابدأ التعلم الآن
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={text}>
          ما الذي يمكنك فعله الآن؟
        </Text>
        <Text style={listItem}>✅ مشاهدة جميع الدروس المدفوعة</Text>
        <Text style={listItem}>✅ حل الاختبارات والتمارين</Text>
        <Text style={listItem}>✅ تتبع تقدمك الدراسي</Text>

        <Hr style={hr} />

        <Text style={footer}>
          مع أطيب التحيات، فريق {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SubscriptionActivationEmail,
  subject: 'تم تفعيل اشتراكك بنجاح! 🎉',
  displayName: 'Subscription Activation',
  previewData: { name: 'أحمد', expiresAt: '2025-07-01' },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
}

const container = {
  padding: '32px 24px',
  maxWidth: '560px',
  margin: '0 auto',
}

const headerSection = {
  backgroundColor: '#0d7268',
  borderRadius: '12px 12px 0 0',
  padding: '24px',
  marginBottom: '0',
  textAlign: 'center' as const,
}

const logo = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: 'bold' as const,
  margin: '0',
}

const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#1a2b3c',
  margin: '24px 0 16px',
  textAlign: 'right' as const,
}

const text = {
  fontSize: '15px',
  color: '#55575d',
  lineHeight: '1.7',
  margin: '0 0 16px',
  textAlign: 'right' as const,
}

const listItem = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.8',
  margin: '0 0 4px',
  textAlign: 'right' as const,
}

const ctaSection = {
  textAlign: 'center' as const,
  margin: '24px 0',
}

const button = {
  backgroundColor: '#0d7268',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '10px',
  fontSize: '16px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  display: 'inline-block',
}

const hr = {
  borderColor: '#e5e5e5',
  margin: '24px 0',
}

const footer = {
  fontSize: '13px',
  color: '#999999',
  margin: '24px 0 0',
  textAlign: 'right' as const,
}
