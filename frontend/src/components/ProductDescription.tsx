"use client";

import React from 'react';
import styles from './ProductDescription.module.css';

interface ProductDescriptionProps {
  description: string;
}

const ProductDescription: React.FC<ProductDescriptionProps> = ({ description }) => {  // Enhanced function to format the description text
  const formatDescription = (text: string) => {
    if (!text) return null;

    // First normalize line breaks
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Split into sections more carefully - preserve multi-sentence content    // Split by: new paragraphs, bullet points, or section headers, but keep content together
    let sections = normalizedText.split(/\n\n+|(?=^\*[\p{L}])|(?=^[-•✓]\s)/mu).filter(line => line.trim());
    
    // Further process sections to handle mixed content
    const refinedSections: string[] = [];
    sections.forEach(section => {
      const trimmed = section.trim();
      if (!trimmed) return;
        // If section contains feature headers followed by content, split them properly
      if (trimmed.includes('*') && !trimmed.startsWith('*')) {
        // Split at the first asterisk feature
        const parts = trimmed.split(/(?=\*[\p{L}])/u);
        parts.forEach(part => {
          if (part.trim()) refinedSections.push(part.trim());
        });
      } else {
        refinedSections.push(trimmed);
      }
    });
    
    return refinedSections.map((section, index) => {
      const trimmedSection = section.trim();
      
      // Skip empty sections
      if (!trimmedSection) return null;
      
      // Check if it's a bullet point (starts with -, •, or ✓)
      if (/^[-•✓]\s*/.test(trimmedSection)) {
        const content = trimmedSection.replace(/^[-•✓]\s*/, '').trim();
        return (
          <li key={index} className={styles.bulletItem}>
            {formatInlineText(content)}
          </li>
        );
      }
        // Check if it's a feature section (starts with *)
      if (/^\*[\p{L}]/u.test(trimmedSection)) {
        // Find the end of the title (first colon)
        const colonIndex = trimmedSection.indexOf(':');
        if (colonIndex !== -1) {
          const title = trimmedSection.substring(1, colonIndex).trim(); // Remove * and get title
          const content = trimmedSection.substring(colonIndex + 1).trim(); // Get everything after colon
          // console.log(`DEBUG - ProductDescription.formatDescription - feature: ${title}, content: ${content}`); // Commented out for production
          return (
            <div key={index} className={styles.featureSection}>
              <h4 className={styles.featureTitle}>
                {title}
              </h4>
              <div className={styles.featureContent}>
                {formatMultiSentenceContent(content)}
              </div>
            </div>
          );
        } else {
          // No colon, just a title
          // console.log(`DEBUG - ProductDescription.formatDescription - feature title: ${trimmedSection}`); // Commented out for production
          const title = trimmedSection.replace(/^\*/, '').trim();
          return (
            <div key={index} className={styles.featureSection}>
              <h4 className={styles.featureTitle}>
                {formatInlineText(title)}
              </h4>
            </div>
          );
        }
      }
      
      // Regular paragraph
      return (
        <div key={index} className={styles.paragraph}>
          {formatMultiSentenceContent(trimmedSection)}
        </div>
      );
    });  };

  // New function to handle multi-sentence content properly
  const formatMultiSentenceContent = (content: string) => {
    // Don't split into sentences - preserve the original structure with line breaks
    return (
      <div style={{ whiteSpace: 'pre-line' }}>
        {formatInlineText(content)}
      </div>
    );
  };

  // Enhanced function to format inline text with Tiffany blue emphasis
  const formatInlineText = (text: string) => {
    // Handle quoted phrases - "text" becomes Tiffany blue and bold
    text = text.replace(/"([^"]+)"/g, '<span class="tiffanyEmphasis">"$1"</span>');
    
    // Handle double asterisk emphasis - **text** becomes Tiffany blue and bold
    text = text.replace(/\*\*([^*]+)\*\*/g, '<span class="tiffanyEmphasis">$1</span>');
    
    // Handle single asterisk emphasis - *text* becomes regular bold
    text = text.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
    
    // Handle checkmarks
    text = text.replace(/✓/g, '<span class="checkmark">✓</span>');
    
    // Handle Tiffany blue emphasis for key brand words and product terms
    const brandWords = [
      'premium', 'luxury', 'exclusive', 'limited', 'collection', 'handcrafted',
      'authentic', 'original', 'unique', 'special', 'signature', 'finest',
      'quality', 'superior', 'exceptional', 'professional', 'designer',
      'artisan', 'crafted', 'elegant', 'sophisticated', 'timeless'
    ];
    
    brandWords.forEach(word => {
      const regex = new RegExp(`\\b(${word})\\b`, 'gi');
      text = text.replace(regex, '<span class="tiffanyBold">$1</span>');
    });
    
    // Handle percentages and measurements
    text = text.replace(/(\d+%|\d+-?\d*\s*[A-Z]{2,}|\d+\s*GSM)/gi, '<span class="highlight">$1</span>');
    
    // Handle size specifications (S, M, L, XL, etc.)
    // text = text.replace(/\b([XS|S|M|L|XL|XXL|XXXL]+)\b/g, '<span class="sizeEmphasis">$1</span>');
    
    // Handle color names and material types
    const colorMaterials = [
      'cotton', 'polyester', 'silk', 'wool', 'linen', 'denim', 'leather', 'terry', 'canvas',
      'elastane', 'spandex', 'viscose', 'rayon', 'nylon', 'acrylic',
      'black', 'white', 'blue', 'red', 'green', 'yellow', 'pink', 'purple',
      'gray', 'grey', 'brown', 'navy', 'khaki', 'beige', 'cream', 'maroon'
    ];
    
    colorMaterials.forEach(word => {
      const regex = new RegExp(`\\b(${word})\\b`, 'gi');
      text = text.replace(regex, '<span class="materialEmphasis">$1</span>');
    });
    
    // Handle line breaks - convert \n to <br> tags
    text = text.replace(/\n/g, '<br>');
    
    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  };  // Enhanced parse description to extract structured content properly
  const parseDescription = (text: string) => {
    // Normalize line breaks first
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // More sophisticated parsing that preserves multi-sentence content
    const sections = normalizedText.split(/\n\n+/).filter(section => section.trim());
    const bullets: string[] = [];
    const features: string[] = [];
    let mainDescription = '';
    
    sections.forEach(section => {
      const trimmedSection = section.trim();
      
      // Check for bullet points
      if (/^[-•✓]\s*/.test(trimmedSection)) {
        const lines = trimmedSection.split('\n');
        lines.forEach(line => {
          if (/^[-•✓]\s*/.test(line.trim())) {
            bullets.push(line.trim().replace(/^[-•✓]\s*/, '').trim());
          }
        });
      }      // Check for feature sections
      else if (/^\*[\p{L}]/u.test(trimmedSection)) {
        features.push(trimmedSection);
      }
      // Regular content becomes main description
      else if (trimmedSection.length > 10) {
        mainDescription += trimmedSection + '\n\n';
      }
    });
    
    return { 
      mainDescription: mainDescription.trim(), 
      bullets, 
      features 
    };
  };

  const { mainDescription, bullets, features } = parseDescription(description);
  const hasStructuredContent = bullets.length > 0 || features.length > 0;

  if (!hasStructuredContent) {
    // For unstructured text, try to format it nicely
    return (
      <div className={styles.descriptionContainer}>
        <div className={styles.formattedContent}>
          {formatDescription(description)}
        </div>
      </div>
    );
  }
  return (
    <div className={styles.descriptionContainer}>
      {mainDescription && (
        <div className={styles.mainDescription}>
          <div>{formatMultiSentenceContent(mainDescription)}</div>
        </div>
      )}
      
      {features.length > 0 && (
        <div className={styles.featuresSection}>
          <h3 className={styles.sectionTitle}>Key Features</h3>
          <div className={styles.featuresList}>
            {features.map((feature, index) => {
              const colonIndex = feature.indexOf(':');
              if (colonIndex !== -1) {
                const title = feature.substring(1, colonIndex).trim(); // Remove * and get title
                const content = feature.substring(colonIndex + 1).trim(); // Get everything after colon
                
                return (
                  <div key={index} className={styles.featureItem}>
                    <h4 className={styles.featureTitle}>{title}</h4>
                    <div className={styles.featureContent}>
                      {formatMultiSentenceContent(content)}
                    </div>
                  </div>
                );
              } else {
                const title = feature.replace(/^\*/, '').trim();
                return (
                  <div key={index} className={styles.featureItem}>
                    <h4 className={styles.featureTitle}>{formatInlineText(title)}</h4>
                  </div>
                );
              }
            })}
          </div>
        </div>
      )}
      
      {bullets.length > 0 && (
        <div className={styles.highlightsSection}>
          <h3 className={styles.sectionTitle}>Highlights</h3>
          <ul className={styles.bulletList}>
            {bullets.map((bullet, index) => (
              <li key={index} className={styles.bulletItem}>
                {formatInlineText(bullet)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ProductDescription;
