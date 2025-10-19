import React from 'react'
import AboutPopup from './AboutPopup'
import Header from './Header'
import NavigationBar from './NavigationBar'

function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* Header */}
      <Header />
      
      {/* Navigation Bar */}
      <NavigationBar currentPage="about" />

      {/* Main Content */}
      <main className="flex-1 py-12 p-page">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <AboutPopup isOpen={true} onClose={() => {}} isInline={true} showCloseButtons={false} />
        </div>
      </main>
    </div>
  )
}

export default AboutPage
