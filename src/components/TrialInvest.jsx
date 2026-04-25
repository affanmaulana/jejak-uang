import React from 'react';

export default function TrialInvest() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '65vh',
      textAlign: 'center',
      padding: '60px 24px',
      background: 'var(--color-surface-card)',
      borderRadius: '32px',
      border: '1.5px solid var(--color-border-subtle)',
      boxShadow: '0 20px 40px rgba(15, 23, 42, 0.06)',
      marginTop: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Background Elements (Using DataViz Tokens) */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        right: '-10%',
        width: '350px',
        height: '350px',
        background: 'radial-gradient(circle, var(--color-viz-kripto) 0%, transparent 70%)',
        opacity: 0.15,
        filter: 'blur(60px)',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-15%',
        left: '-10%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, var(--color-viz-sp500) 0%, transparent 70%)',
        opacity: 0.1,
        filter: 'blur(50px)',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '-5%',
        width: '200px',
        height: '200px',
        background: 'radial-gradient(circle, var(--color-viz-rdpu) 0%, transparent 70%)',
        opacity: 0.12,
        filter: 'blur(40px)',
        zIndex: 0
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Feature Tag (Using Eyebrow Tokens) */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          background: 'var(--color-semantic-success-bg)',
          border: '1.5px solid var(--color-semantic-success-border)',
          borderRadius: '999px',
          marginBottom: '28px'
        }}>
          <span style={{ 
            width: '6px', 
            height: '6px', 
            borderRadius: '50%', 
            background: 'var(--color-semantic-success)',
            boxShadow: '0 0 8px var(--color-semantic-success)'
          }} />
          <span style={{ 
            fontSize: 'var(--text-eyebrow-size)', 
            fontWeight: 'var(--text-eyebrow-weight)', 
            color: 'var(--color-semantic-success)',
            textTransform: 'var(--text-eyebrow-transform)',
            letterSpacing: 'var(--text-eyebrow-letter-spacing)'
          }}>
            Fitur Segera Hadir
          </span>
        </div>

        {/* Colorful Icon Container (Using Viz Tokens) */}
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '30px',
          background: 'linear-gradient(135deg, var(--color-viz-kripto) 0%, var(--color-viz-rd-campuran) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 32px',
          boxShadow: '0 12px 32px rgba(67, 56, 202, 0.25)',
          border: '2px solid rgba(255, 255, 255, 0.1)'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" style={{ width: '48px', height: '48px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
          </svg>
        </div>

        <h2 style={{
          fontSize: 'var(--text-h1-size)',
          fontWeight: 'var(--text-h1-weight)',
          lineHeight: 'var(--text-h1-line-height)',
          letterSpacing: 'var(--text-h1-letter-spacing)',
          color: 'var(--color-text-primary)',
          marginBottom: '16px'
        }}>
          Simulasi Trial Invest
        </h2>

        <p style={{
          fontSize: 'var(--text-subtitle-size)',
          fontWeight: '400',
          lineHeight: 'var(--text-subtitle-line-height)',
          color: 'var(--color-text-secondary)',
          maxWidth: '480px',
          margin: '0 auto'
        }}>
          Kami sedang membangun pengalaman simulasi investasi yang revolusioner. 
          Segera Anda dapat memproyeksikan portofolio Anda dengan skenario pasar yang lebih dinamis dan interaktif.
        </p>

        {/* Status Indicators (Using Tokens) */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '40px',
          marginTop: '48px',
          paddingTop: '32px',
          borderTop: '1.5px solid var(--color-border-subtle)'
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ 
              fontSize: 'var(--text-eyebrow-size)', 
              fontWeight: 'var(--text-eyebrow-weight)', 
              color: 'var(--color-text-tertiary)', 
              textTransform: 'var(--text-eyebrow-transform)',
              letterSpacing: 'var(--text-eyebrow-letter-spacing)',
              marginBottom: '6px'
            }}>
              Status
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-viz-cash)' }} />
              <div style={{ 
                fontSize: 'var(--text-body-bold-size)', 
                fontWeight: 'var(--text-body-bold-weight)', 
                color: 'var(--color-viz-cash)' 
              }}>
                Aktif Dikembangkan
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ 
              fontSize: 'var(--text-eyebrow-size)', 
              fontWeight: 'var(--text-eyebrow-weight)', 
              color: 'var(--color-text-tertiary)', 
              textTransform: 'var(--text-eyebrow-transform)',
              letterSpacing: 'var(--text-eyebrow-letter-spacing)',
              marginBottom: '6px'
            }}>
              Prioritas
            </div>
            <div style={{ 
              fontSize: 'var(--text-body-bold-size)', 
              fontWeight: 'var(--text-body-bold-weight)', 
              color: 'var(--color-viz-rd-saham)' 
            }}>
              Sangat Tinggi
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
