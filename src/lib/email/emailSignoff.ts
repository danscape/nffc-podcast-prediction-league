export function buildEmailSignoffHtml() {
  return `
    <div style="margin-top: 26px; padding-top: 18px; border-top: 1px solid #D9D6D1; color: #111111;">
      <p style="margin: 0 0 6px; line-height: 1.5;">
        Thanks,
      </p>
      <p style="margin: 0; line-height: 1.5;">
        <strong>Dan</strong><br />
        <a href="mailto:nffcstats@gmail.com" style="color: #C8102E; text-decoration: none; font-weight: 700;">
          nffcstats@gmail.com
        </a>
      </p>
    </div>
  `;
}

export function buildEmailSignoffText() {
  return ["Thanks,", "", "Dan", "nffcstats@gmail.com"].join("\n");
}
