/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>تمت دعوتك للانضمام إلى {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logoText}>{siteName}</Heading>
        </Section>
        <Heading style={h1}>تمت دعوتك! 🎉</Heading>
        <Text style={text}>
          تمت دعوتك للانضمام إلى{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . اضغط على الزر أدناه لقبول الدعوة وإنشاء حسابك.
        </Text>
        <Section style={ctaSection}>
          <Button style={button} href={confirmationUrl}>
            قبول الدعوة
          </Button>
        </Section>
        <Text style={footer}>
          إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذا البريد بأمان.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif" }
const container = { padding: '0', maxWidth: '560px', margin: '0 auto' }
const header = { backgroundColor: '#0d7268', borderRadius: '12px 12px 0 0', padding: '24px', textAlign: 'center' as const }
const logoText = { color: '#ffffff', fontSize: '22px', fontWeight: 'bold' as const, margin: '0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a2b3c', margin: '24px 25px 16px', textAlign: 'right' as const }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.7', margin: '0 25px 20px', textAlign: 'right' as const }
const link = { color: '#0d7268', textDecoration: 'underline' }
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = { backgroundColor: '#0d7268', color: '#ffffff', fontSize: '15px', borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', fontWeight: 'bold' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 25px 20px', textAlign: 'right' as const }
