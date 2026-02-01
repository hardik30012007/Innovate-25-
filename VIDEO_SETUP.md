# Video Background Setup

## Video File Location

The landing page expects a video file at:
```
assets/hero-video.mp4
```

## Video Requirements

**Recommended Specifications:**
- **Format**: MP4 (H.264 codec)
- **Resolution**: 1920x1080 (Full HD) or higher
- **Aspect Ratio**: 16:9
- **Duration**: 10-30 seconds (will loop)
- **File Size**: Under 10MB for optimal loading
- **Frame Rate**: 30fps
- **Content**: Urban greenery, parks, tree-lined streets, or aerial views of Delhi green spaces

## Where to Get Video

### Option 1: Free Stock Videos
- **Pexels**: https://www.pexels.com/search/videos/urban%20park/
- **Pixabay**: https://pixabay.com/videos/search/green%20city/
- **Unsplash**: https://unsplash.com/s/videos/urban-nature

### Option 2: Create Your Own
Record footage of:
- Delhi parks and green spaces
- Tree-lined avenues
- Community gardens
- Aerial drone footage of green corridors

## Setup Instructions

1. **Create assets folder** (if it doesn't exist):
   ```bash
   mkdir assets
   ```

2. **Download or add your video**:
   - Save the video as `hero-video.mp4`
   - Place it in the `assets` folder

3. **Test the page**:
   - Open `index.html` in a browser
   - The video should autoplay in the background
   - If the video doesn't load, the gradient background will show as fallback

## Fallback Behavior

If no video is present, the page will display:
- A beautiful gradient background (dark slate with emerald/purple accents)
- All functionality remains the same
- No errors or broken elements

## Alternative: Use a Placeholder

For testing purposes, you can use a solid color or gradient by commenting out the video element in `index.html`:

```html
<!-- Comment out the video -->
<!--
<video autoplay muted loop playsinline id="hero-video">
    <source src="assets/hero-video.mp4" type="video/mp4">
</video>
-->
```

The gradient overlay will automatically become the background.

## Performance Tips

- Compress the video to reduce file size
- Use lazy loading for below-the-fold content
- Consider using a poster image for mobile devices
- Test on different connection speeds
