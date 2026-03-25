/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>رمز التحقق الخاص بك</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logoText}>طالب مكين</Heading>
        </Section>
        <Heading style={h1}>تأكيد الهوية</Heading>
        <Text style={text}>استخدم الرمز أدناه لتأكيد هويتك:</Text>
        <Section style={ctaSection}>
          <Text style={codeStyle}>{token}</Text>
        </Section>
        <Text style={footer}>
          هذا الرمز صالح لفترة محدودة. إذا لم تطلب هذا الرمز، يمكنك تجاهل هذا البريد.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif" }
const container = { padding: '0', maxWidth: '560px', margin: '0 auto' }
const header = { backgroundColor: '#0d7268', borderRadius: '12px 12px 0 0', padding: '24px', textAlign: 'center' as const }
const logoText = { color: '#ffffff', fontSize: '22px', fontWeight: 'bold' as const, margin: '0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a2b3c', margin: '24px 25px 16px', textAlign: 'right' as const }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.7', margin: '0 25px 20px', textAlign: 'right' as const }
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '28px', fontWeight: 'bold' as const, color: '#0d7268', letterSpacing: '4px', margin: '0' }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 25px 20px', textAlign: 'right' as const }
