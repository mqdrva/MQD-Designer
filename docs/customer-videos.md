# Homepage videos

The homepage video gallery sits immediately above the Real MQD customers section.
The uploaded clip is encoded as a 540 × 960 H.264/AAC MP4 with fast-start metadata.
It loads near the viewport and plays muted, inline, on a loop. Native controls
allow visitors to pause or enable sound. Reduced-motion visitors press Play.

To add another clip, place an optimized MP4 and poster in `assets/customer-videos/`
and add another `figure.customer-video` inside `.customer-videos` in
`custom-apparel.html`. Copy the existing video element, updating its poster,
`data-video-src`, fallback link, dimensions, and accessible label. The grid and
loader handle every video automatically; preserve each video's actual aspect
ratio if a future clip is not vertical.
