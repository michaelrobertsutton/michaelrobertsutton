# michaelrobertsutton.com — Development

Single-page editorial portfolio for Michael Sutton — built with vanilla HTML, CSS, and JavaScript. No frameworks, no build step.

### Getting Started

These instructions will get the site running locally for development.

#### Prerequisites

- Python 3 (for local dev server)
- AWS CLI with a `personal` profile configured (for deployment only)
- `CLOUDFRONT_DISTRIBUTION_ID` set in your shell environment (for deployment only)

#### Local Development

Start a static server from the repo root:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

### File Map

```
index.html                           Page structure, content, metadata, JSON-LD schema
assets/css/styles.css                Design system, layout, typography, responsive behavior
assets/js/script.js                  Navigation state, active-section highlighting, back-to-top
documents/Sutton_Michael_Resume.pdf  Source resume used for proof blocks
sitemap.xml                          Static sitemap
robots.txt                           Crawler policy
```

### Edit Workflow

1. Update copy and section structure in `index.html`.
2. Update visual system and spacing in `assets/css/styles.css`.
3. Update interaction behavior in `assets/js/script.js`.
4. Reload browser and verify keyboard navigation, focus states, and anchor links.

### Deployment

The site deploys to S3 + CloudFront via `deploy.sh`.

#### Prerequisites

Add your CloudFront distribution ID to your shell environment (one-time setup):

```bash
echo 'export CLOUDFRONT_DISTRIBUTION_ID="your-distribution-id"' >> ~/.zshrc
source ~/.zshrc
```

#### Deploy

```bash
./deploy.sh
```

Syncs all site files to S3 and invalidates the CloudFront cache. Requires the AWS CLI `personal` profile to be configured with appropriate permissions.

### Built With

- Vanilla HTML, CSS, JavaScript
- AWS S3 + CloudFront
