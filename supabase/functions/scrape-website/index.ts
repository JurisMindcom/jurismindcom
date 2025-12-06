import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapedContent {
  url: string;
  title: string;
  description: string;
  content: string;
  headings: string[];
  links: string[];
  success: boolean;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Scraping website: ${url}`);

    // Fetch the website content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5,bn;q=0.3',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    
    // Parse the HTML
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    if (!doc) {
      throw new Error('Failed to parse HTML');
    }

    // Extract title
    const titleEl = doc.querySelector('title');
    const title = titleEl?.textContent?.trim() || parsedUrl.hostname;

    // Extract meta description
    const descEl = doc.querySelector('meta[name="description"]');
    const description = descEl?.getAttribute('content') || '';

    // Remove script, style, nav, footer, header, aside elements
    const elementsToRemove = doc.querySelectorAll('script, style, nav, footer, header, aside, noscript, iframe, svg, form, button, input, select, textarea');
    elementsToRemove.forEach((el: any) => el.remove());

    // Extract main content
    const mainContent = doc.querySelector('main, article, .content, .post, .article, #content, #main') || doc.body;
    
    // Extract all headings
    const headings: string[] = [];
    const headingEls = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headingEls.forEach((el: any) => {
      const text = el.textContent?.trim();
      if (text && text.length > 0 && text.length < 200) {
        headings.push(text);
      }
    });

    // Extract all links
    const links: string[] = [];
    const linkEls = doc.querySelectorAll('a[href]');
    linkEls.forEach((el: any) => {
      const href = el.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          const absoluteUrl = new URL(href, url).href;
          if (!links.includes(absoluteUrl)) {
            links.push(absoluteUrl);
          }
        } catch {
          // Invalid URL, skip
        }
      }
    });

    // Extract text content
    let content = '';
    if (mainContent) {
      // Get all text nodes
      const walker = (node: any): string => {
        if (node.nodeType === 3) { // Text node
          return node.textContent || '';
        }
        if (node.nodeType === 1) { // Element node
          const tagName = node.tagName?.toLowerCase();
          // Skip invisible elements
          if (['script', 'style', 'noscript'].includes(tagName)) {
            return '';
          }
          
          let text = '';
          node.childNodes.forEach((child: any) => {
            text += walker(child);
          });
          
          // Add spacing for block elements
          if (['p', 'div', 'li', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th'].includes(tagName)) {
            text = '\n' + text.trim() + '\n';
          }
          
          return text;
        }
        return '';
      };
      
      content = walker(mainContent)
        .replace(/\n{3,}/g, '\n\n') // Remove excess newlines
        .replace(/[ \t]+/g, ' ') // Normalize spaces
        .trim();
    }

    // Limit content length to avoid huge payloads
    const maxContentLength = 50000;
    if (content.length > maxContentLength) {
      content = content.substring(0, maxContentLength) + '\n\n[Content truncated due to length...]';
    }

    const result: ScrapedContent = {
      url,
      title,
      description,
      content,
      headings: headings.slice(0, 50),
      links: links.slice(0, 100),
      success: true,
    };

    console.log(`Successfully scraped: ${url} - ${content.length} chars`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scraping error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to scrape website',
        url: '',
        title: '',
        description: '',
        content: '',
        headings: [],
        links: [],
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
