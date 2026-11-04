// ─────────────────────────────────────────────────────────────
// SITE DATA — profile, Lab (GitHub + toolbox), About. Edit, then `node build.mjs`.
// ─────────────────────────────────────────────────────────────

export const profile = {
  name: "Nicolle Rodrigues",
  title: "AI UX Design Engineer",
  line: "Designing for real users behind the screen.",
  lineHtml: "Designing for<br>real users<br>behind the screen.",
  sub: "I design it, then I ship it.",
  location: "Chicago, IL",
  citizenship: "U.S. citizen",
  photo: "media/about/nicolle.jpg",
  email: "nicolleadduci@gmail.com",
  github: "nicolleadduci",
  links: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/nicolleadduci/" },
    { label: "GitHub", href: "https://github.com/nicolleadduci" },
    { label: "Behance", href: "https://www.behance.net/nicollerodrigues" },
  ],
  web3formsKey: "3eb2e900-50bc-455b-bd28-373bd985f26f",
};

// Public repos. Stars + "updated" refresh live from the GitHub API in the browser;
// these values are the fallback if the API is slow or rate-limited.
export const repos = [
  {
    name: "reference-to-motion",
    desc: "Turn a reference video into a brand motion film: measured frame by frame, cut to the beat, built in Remotion.",
    lang: "JavaScript",
    stars: 2,
    tags: ["claude-code", "remotion", "music-sync"],
    project: "reference-to-motion",
  },
  {
    name: "gif-banners-multisize",
    desc: "Resize one animated ad into a full set of GIF display banners at any size, art-directed per size, under the KB cap.",
    lang: "JavaScript",
    stars: 0,
    tags: ["claude-code", "display-ads", "gif"],
  },
  {
    name: "brand-translate-deck",
    desc: "Rebuild a deck in Figma Slides with the exact copy, translate the brand from examples, and make realistic mockups.",
    lang: "HTML",
    stars: 0,
    tags: ["claude-code", "figma-slides", "mockups"],
  },
  {
    name: "brand-kit-builder",
    desc: "Build a brand-kit skill for any brand: fixed templates, a JSON-spec deck builder and a checker that flags off-brand files.",
    lang: "Python",
    stars: 0,
    tags: ["claude-code", "brand-systems", "pptx-docx"],
  },
];

// Skills and tools I've built for myself and teams (not all public).
export const toolbox = [
  { name: "imaginarium-brand-kit", what: "On-brand PPTX, DOCX, XLSX and PDF for the team, with a checker that flags off-brand files.", tag: "Team skill" },
  { name: "block-authoring", what: "Turns a Figma frame or screenshot into tokenised HTML/CSS blocks for any brand.", tag: "Skill" },
  { name: "tiktok-captions", what: "Word-by-word animated captions in Remotion, highlighted as they're spoken.", tag: "Skill" },
  { name: "transcript", what: "Local, offline word-level transcription so client footage never leaves the machine.", tag: "Skill" },
  { name: "lufs-meter", what: "Real BS.1770 loudness measurement in Node, for broadcast-ready mixes.", tag: "Tool" },
  { name: "cutout-studio", what: "Flood-fill product cutouts that keep white detail and drop baked-in shadows.", tag: "Tool" },
  { name: "make-media", what: "One command from a master video to a web loop, poster and film.", tag: "Tool" },
];

export const stack = [
  { group: "Design", items: ["UX research", "Journey mapping", "Wireframing", "Prototyping", "Design systems", "Accessibility (WCAG)", "Figma", "Adobe CC"] },
  { group: "Build", items: ["HTML / CSS", "JavaScript", "React", "Next.js", "Tailwind", "Prisma", "Vercel", "Webflow"] },
  { group: "AI", items: ["Claude Code", "Skill authoring", "Prompt engineering", "MCP: Figma, Webflow, Vercel", "AI prototyping", "Agent workflows"] },
  { group: "Motion", items: ["Remotion", "ffmpeg", "After Effects scripting", "Beat-grid editing", "GIF + display ads"] },
];

export const career = [
  { years: "2025 – now", role: "Senior AI UX Design Engineer", org: "The Imaginarium (contract)", note: "Design to code with AI. Built the company-wide brand-kit skill and mentor the team on Claude Code." },
  { years: "2022 – 2025", role: "Senior UX Designer", org: "Zion & Zion", note: "Full-cycle UX for B2B and B2C. +25% session duration, −15% bounce, +11% AOV on e-commerce." },
  { years: "2019 – 2022", role: "UX Designer", org: "Vistex", note: "Web projects for Vistex Hospital and Vistex Innovation, across SaaS, healthcare and manufacturing." },
  { years: "2018 – 2019", role: "Sr Graphic Designer", org: "Xentris Wireless", note: "Mobile-first e-commerce for a product launch, packaging for Verizon." },
  { years: "2015 – 2018", role: "Creative Director", org: "Mais Propaganda · Recrie, Brazil", note: "Led creative from concept to delivery and mentored junior designers." },
];

export const awards = [
  { year: "2024", name: "Digital Transformation of the Year", for: "Arthur Andrew" },
  { year: "2024", name: "Ecommerce Website, Mastery", for: "Arthur Andrew" },
  { year: "2023", name: "Digital Brand Transformation of the Year", for: "Liquid Rubber" },
  { year: "2023", name: "Ecommerce Website, Excellence", for: "Liquid Rubber" },
  { year: "2023", name: "Consumer Website, Excellence", for: "Liquid Rubber" },
  { year: "2023", name: "Business Website, Excellence", for: "FreedomFromAccounting" },
];

export const education = [
  { year: "2020", name: "NN/g UX Certification", org: "University of Arkansas" },
  { year: "2014 – 15", name: "BFA Graphic Design", org: "DePaul University, Chicago" },
  { year: "2012 – 14", name: "BFA Industrial Design", org: "UFCG, Brazil · Science Without Borders scholar" },
];

// The unserious part (About page). Each one has its own hover animation in build.mjs.
export const fun = [
  { k: "coffee", title: "Coffee first.", text: "Then pixels. Then more coffee." },
  { k: "chess", title: "Average chess player.", text: "My dad is still better than me." },
  { k: "home", title: "Brazil to Chicago.", text: "Born in Brazil. Chicago has been home for over 10 years." },
  { k: "cats", title: "Pets.", text: "Gordon Ramsey and Sweet Pea. They might join a meeting or two." },
  { k: "sushi", title: "Foodie.", text: "I pretend to read the whole menu, then order sushi." },
  { k: "claude", title: "In a serious relationship with Claude.", text: "We ship things together. It's going really well." },
];
