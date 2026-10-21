// Five unpublished review fixtures with approved background originals. Never inserted into the public catalog.
export const demoVersions=[
  {
    "id": "10000000-0000-4000-8000-000000000001",
    "template_id": "00000000-0000-4000-8000-000000000001",
    "name": "UNPUBLISHED · Pressure Wash Demo",
    "categories": [
      "Pressure Washing",
      "General Business"
    ],
    "range": "Premium · All-over print",
    "draftStatus": "Approved background; finished shirt remains a draft.",
    "backgroundSource": "02-pressure-washing-black-blue.jpg",
    "payload": {
      "schema": "mqd-design-v1",
      "engine": {
        "calibration": "v26-surface-uv-collar-strip"
      },
      "product": {
        "id": "tshirt",
        "name": "All-Over Print T-Shirt",
        "category": "T-Shirts",
        "model": "https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/tshirt.glb"
      },
      "templates": {
        "Front": {
          "path": "/assets/templates/tshirt/front.png",
          "width": 3763,
          "height": 4992
        },
        "Back": {
          "path": "/assets/templates/tshirt/back.png",
          "width": 3750,
          "height": 5011
        },
        "Left Sleeve": {
          "path": "/assets/templates/tshirt/sleeve.png",
          "width": 2841,
          "height": 1702
        },
        "Right Sleeve": {
          "path": "/assets/templates/tshirt/sleeve.png",
          "width": 2841,
          "height": 1702
        },
        "Collar": {
          "path": "/assets/templates/tshirt/collar.png",
          "width": 3276,
          "height": 435
        }
      },
      "activeZone": "Front",
      "design": {
        "zones": {
          "Front": {
            "background": "#083a59",
            "layers": [
              {
                "id": "Front-background",
                "type": "image",
                "label": "Background",
                "filename": "02-pressure-washing-black-blue.jpg",
                "src": "/assets/template-backgrounds/02-pressure-washing-black-blue.jpg",
                "x": 0,
                "y": 0,
                "scale": 1,
                "rotation": 0,
                "flipX": false,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              },
              {
                "id": "Front-logo",
                "type": "image",
                "label": "Sample logo",
                "filename": "sample-logo.png",
                "src": "/assets/template-demos/sample-logo.png",
                "x": 0,
                "y": -20,
                "scale": 0.25,
                "rotation": 0,
                "flipX": false,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              },
              {
                "id": "Front-phone",
                "type": "text",
                "label": "Phone number",
                "text": "(555) 010-2026",
                "x": 0,
                "y": 14,
                "scale": 0.47,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Inter",
                "strokeColor": "#000000",
                "strokeWidth": 0,
                "bold": true,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Front-services",
                "type": "text",
                "label": "Services",
                "text": "YOUR SERVICES HERE",
                "x": 0,
                "y": 28,
                "scale": 0.35,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Inter",
                "strokeColor": "#000000",
                "strokeWidth": 0,
                "bold": true,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Back": {
            "background": "#083a59",
            "layers": [
              {
                "id": "Back-background",
                "type": "image",
                "label": "Background",
                "filename": "02-pressure-washing-black-blue.jpg",
                "src": "/assets/template-backgrounds/02-pressure-washing-black-blue.jpg",
                "x": 0,
                "y": 0,
                "scale": 1,
                "rotation": 0,
                "flipX": true,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              },
              {
                "id": "Back-logo",
                "type": "image",
                "label": "Sample logo",
                "filename": "sample-logo.png",
                "src": "/assets/template-demos/sample-logo.png",
                "x": 0,
                "y": -20,
                "scale": 0.38,
                "rotation": 0,
                "flipX": false,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              },
              {
                "id": "Back-phone",
                "type": "text",
                "label": "Phone number",
                "text": "(555) 010-2026",
                "x": 0,
                "y": 12,
                "scale": 0.47,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Inter",
                "strokeColor": "#000000",
                "strokeWidth": 0,
                "bold": true,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services",
                "type": "text",
                "label": "Services",
                "text": "YOUR SERVICES HERE",
                "x": 0,
                "y": 28,
                "scale": 0.35,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Inter",
                "strokeColor": "#000000",
                "strokeWidth": 0,
                "bold": true,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Left Sleeve": {
            "background": "#083a59",
            "layers": [
              {
                "id": "sleeve-flag",
                "type": "image",
                "label": "Sleeve flag",
                "filename": "demo-flag.png",
                "src": "/assets/template-demos/demo-flag.png",
                "x": 0,
                "y": 0,
                "scale": 0.35,
                "rotation": 0,
                "flipX": false,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              }
            ]
          },
          "Right Sleeve": {
            "background": "#083a59",
            "layers": []
          },
          "Collar": {
            "background": "#083a59",
            "layers": []
          }
        }
      }
    },
    "rules": [
      {
        "zone": "Front",
        "layerId": "Front-background",
        "role": "locked",
        "label": "Front background"
      },
      {
        "zone": "Front",
        "layerId": "Front-logo",
        "role": "logo",
        "label": "Your logo"
      },
      {
        "zone": "Front",
        "layerId": "Front-phone",
        "role": "text",
        "label": "Phone number"
      },
      {
        "zone": "Front",
        "layerId": "Front-services",
        "role": "text",
        "label": "Services"
      },
      {
        "zone": "Back",
        "layerId": "Back-background",
        "role": "locked",
        "label": "Back background"
      },
      {
        "zone": "Back",
        "layerId": "Back-logo",
        "role": "logo",
        "label": "Your logo"
      },
      {
        "zone": "Back",
        "layerId": "Back-phone",
        "role": "text",
        "label": "Phone number"
      },
      {
        "zone": "Back",
        "layerId": "Back-services",
        "role": "text",
        "label": "Services"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "sleeve-flag",
        "role": "locked",
        "label": "Sleeve flag"
      }
    ],
    "previews": {
      "Front": "/assets/template-demos/1-front.png",
      "Back": "/assets/template-demos/1-back.png"
    }
  },
  {
    "id": "10000000-0000-4000-8000-000000000002",
    "template_id": "00000000-0000-4000-8000-000000000002",
    "name": "UNPUBLISHED · Lawn Crew Demo",
    "categories": [
      "Lawn Care"
    ],
    "range": "Premium · All-over print",
    "draftStatus": "Approved background; finished shirt remains a draft.",
    "backgroundSource": "07-landscaping-fresh-lawn.png",
    "payload": {
      "schema": "mqd-design-v1",
      "engine": {
        "calibration": "v26-surface-uv-collar-strip"
      },
      "product": {
        "id": "tshirt",
        "name": "All-Over Print T-Shirt",
        "category": "T-Shirts",
        "model": "https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/tshirt.glb"
      },
      "templates": {
        "Front": {
          "path": "/assets/templates/tshirt/front.png",
          "width": 3763,
          "height": 4992
        },
        "Back": {
          "path": "/assets/templates/tshirt/back.png",
          "width": 3750,
          "height": 5011
        },
        "Left Sleeve": {
          "path": "/assets/templates/tshirt/sleeve.png",
          "width": 2841,
          "height": 1702
        },
        "Right Sleeve": {
          "path": "/assets/templates/tshirt/sleeve.png",
          "width": 2841,
          "height": 1702
        },
        "Collar": {
          "path": "/assets/templates/tshirt/collar.png",
          "width": 3276,
          "height": 435
        }
      },
      "activeZone": "Front",
      "design": {
        "zones": {
          "Front": {
            "background": "#173a2b",
            "layers": [
              {
                "id": "Front-background",
                "type": "image",
                "label": "Background",
                "filename": "07-landscaping-fresh-lawn.png",
                "src": "/assets/template-backgrounds/07-landscaping-fresh-lawn.png",
                "x": 0,
                "y": 0,
                "scale": 1,
                "rotation": 0,
                "flipX": false,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              },
              {
                "id": "Front-logo",
                "type": "image",
                "label": "Sample logo",
                "filename": "sample-logo.png",
                "src": "/assets/template-demos/sample-logo.png",
                "x": 0,
                "y": -20,
                "scale": 0.25,
                "rotation": 0,
                "flipX": false,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              },
              {
                "id": "Front-phone",
                "type": "text",
                "label": "Phone number",
                "text": "(555) 010-2026",
                "x": 0,
                "y": 14,
                "scale": 0.47,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Inter",
                "strokeColor": "#000000",
                "strokeWidth": 0,
                "bold": true,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Front-services",
                "type": "text",
                "label": "Services",
                "text": "YOUR SERVICES HERE",
                "x": 0,
                "y": 28,
                "scale": 0.35,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Inter",
                "strokeColor": "#000000",
                "strokeWidth": 0,
                "bold": true,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Back": {
            "background": "#173a2b",
            "layers": [
              {
                "id": "Back-background",
                "type": "image",
                "label": "Background",
                "filename": "07-landscaping-fresh-lawn.png",
                "src": "/assets/template-backgrounds/07-landscaping-fresh-lawn.png",
                "x": 0,
                "y": 0,
                "scale": 1,
                "rotation": 0,
                "flipX": true,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              },
              {
                "id": "Back-logo",
                "type": "image",
                "label": "Sample logo",
                "filename": "sample-logo.png",
                "src": "/assets/template-demos/sample-logo.png",
                "x": 0,
                "y": -20,
                "scale": 0.38,
                "rotation": 0,
                "flipX": false,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              },
              {
                "id": "Back-phone",
                "type": "text",
                "label": "Phone number",
                "text": "(555) 010-2026",
                "x": 0,
                "y": 12,
                "scale": 0.47,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Inter",
                "strokeColor": "#000000",
                "strokeWidth": 0,
                "bold": true,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services",
                "type": "text",
                "label": "Services",
                "text": "YOUR SERVICES HERE",
                "x": 0,
                "y": 28,
                "scale": 0.35,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Inter",
                "strokeColor": "#000000",
                "strokeWidth": 0,
                "bold": true,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Left Sleeve": {
            "background": "#173a2b",
            "layers": [
              {
                "id": "sleeve-flag",
                "type": "image",
                "label": "Sleeve flag",
                "filename": "demo-flag.png",
                "src": "/assets/template-demos/demo-flag.png",
                "x": 0,
                "y": 0,
                "scale": 0.35,
                "rotation": 0,
                "flipX": false,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              }
            ]
          },
          "Right Sleeve": {
            "background": "#173a2b",
            "layers": []
          },
          "Collar": {
            "background": "#173a2b",
            "layers": []
          }
        }
      }
    },
    "rules": [
      {
        "zone": "Front",
        "layerId": "Front-background",
        "role": "locked",
        "label": "Front background"
      },
      {
        "zone": "Front",
        "layerId": "Front-logo",
        "role": "logo",
        "label": "Your logo"
      },
      {
        "zone": "Front",
        "layerId": "Front-phone",
        "role": "text",
        "label": "Phone number"
      },
      {
        "zone": "Front",
        "layerId": "Front-services",
        "role": "text",
        "label": "Services"
      },
      {
        "zone": "Back",
        "layerId": "Back-background",
        "role": "locked",
        "label": "Back background"
      },
      {
        "zone": "Back",
        "layerId": "Back-logo",
        "role": "logo",
        "label": "Your logo"
      },
      {
        "zone": "Back",
        "layerId": "Back-phone",
        "role": "text",
        "label": "Phone number"
      },
      {
        "zone": "Back",
        "layerId": "Back-services",
        "role": "text",
        "label": "Services"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "sleeve-flag",
        "role": "locked",
        "label": "Sleeve flag"
      }
    ],
    "previews": {
      "Front": "/assets/template-demos/2-front.png",
      "Back": "/assets/template-demos/2-back.png"
    }
  },
  {
    "id": "10000000-0000-4000-8000-000000000003",
    "template_id": "00000000-0000-4000-8000-000000000003",
    "name": "UNPUBLISHED · HVAC Demo",
    "categories": [
      "HVAC"
    ],
    "range": "Premium · All-over print",
    "draftStatus": "Abstract review substitute; no HVAC-specific artwork supplied.",
    "backgroundSource": "13-abstract-blue-flow.jpg",
    "payload": {
      "schema": "mqd-design-v1",
      "engine": {
        "calibration": "v26-surface-uv-collar-strip"
      },
      "product": {
        "id": "tshirt",
        "name": "All-Over Print T-Shirt",
        "category": "T-Shirts",
        "model": "https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/tshirt.glb"
      },
      "templates": {
        "Front": {
          "path": "/assets/templates/tshirt/front.png",
          "width": 3763,
          "height": 4992
        },
        "Back": {
          "path": "/assets/templates/tshirt/back.png",
          "width": 3750,
          "height": 5011
        },
        "Left Sleeve": {
          "path": "/assets/templates/tshirt/sleeve.png",
          "width": 2841,
          "height": 1702
        },
        "Right Sleeve": {
          "path": "/assets/templates/tshirt/sleeve.png",
          "width": 2841,
          "height": 1702
        },
        "Collar": {
          "path": "/assets/templates/tshirt/collar.png",
          "width": 3276,
          "height": 435
        }
      },
      "activeZone": "Front",
      "design": {
        "zones": {
          "Front": {
            "background": "#202e4c",
            "layers": [
              {
                "id": "Front-background",
                "type": "image",
                "label": "Background",
                "filename": "13-abstract-blue-flow.jpg",
                "src": "/assets/template-backgrounds/13-abstract-blue-flow.jpg",
                "x": 0,
                "y": 0,
                "scale": 1,
                "rotation": 0,
                "flipX": false,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              },
              {
                "id": "Front-logo",
                "type": "image",
                "label": "Sample logo",
                "filename": "sample-logo.png",
                "src": "/assets/template-demos/sample-logo.png",
                "x": 0,
                "y": -20,
                "scale": 0.25,
                "rotation": 0,
                "flipX": false,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              },
              {
                "id": "Front-phone",
                "type": "text",
                "label": "Phone number",
                "text": "(555) 010-2026",
                "x": 0,
                "y": 14,
                "scale": 0.47,
                "rotation": 0,
                "visible": true,
                "color": "#10243B",
                "font": "Inter",
                "strokeColor": "#000000",
                "strokeWidth": 0,
                "bold": true,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Front-services",
                "type": "text",
                "label": "Services",
                "text": "YOUR SERVICES HERE",
                "x": 0,
                "y": 28,
                "scale": 0.35,
                "rotation": 0,
                "visible": true,
                "color": "#10243B",
                "font": "Inter",
                "strokeColor": "#000000",
                "strokeWidth": 0,
                "bold": true,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Back": {
            "background": "#202e4c",
            "layers": [
              {
                "id": "Back-background",
                "type": "image",
                "label": "Background",
                "filename": "13-abstract-blue-flow.jpg",
                "src": "/assets/template-backgrounds/13-abstract-blue-flow.jpg",
                "x": 0,
                "y": 0,
                "scale": 1,
                "rotation": 0,
                "flipX": true,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              },
              {
                "id": "Back-logo",
                "type": "image",
                "label": "Sample logo",
                "filename": "sample-logo.png",
                "src": "/assets/template-demos/sample-logo.png",
                "x": 0,
                "y": -20,
                "scale": 0.38,
                "rotation": 0,
                "flipX": false,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              },
              {
                "id": "Back-phone",
                "type": "text",
                "label": "Phone number",
                "text": "(555) 010-2026",
                "x": 0,
                "y": 12,
                "scale": 0.47,
                "rotation": 0,
                "visible": true,
                "color": "#10243B",
                "font": "Inter",
                "strokeColor": "#000000",
                "strokeWidth": 0,
                "bold": true,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services",
                "type": "text",
                "label": "Services",
                "text": "YOUR SERVICES HERE",
                "x": 0,
                "y": 28,
                "scale": 0.35,
                "rotation": 0,
                "visible": true,
                "color": "#10243B",
                "font": "Inter",
                "strokeColor": "#000000",
                "strokeWidth": 0,
                "bold": true,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Left Sleeve": {
            "background": "#202e4c",
            "layers": [
              {
                "id": "sleeve-flag",
                "type": "image",
                "label": "Sleeve flag",
                "filename": "demo-flag.png",
                "src": "/assets/template-demos/demo-flag.png",
                "x": 0,
                "y": 0,
                "scale": 0.35,
                "rotation": 0,
                "flipX": false,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              }
            ]
          },
          "Right Sleeve": {
            "background": "#202e4c",
            "layers": []
          },
          "Collar": {
            "background": "#202e4c",
            "layers": []
          }
        }
      }
    },
    "rules": [
      {
        "zone": "Front",
        "layerId": "Front-background",
        "role": "locked",
        "label": "Front background"
      },
      {
        "zone": "Front",
        "layerId": "Front-logo",
        "role": "logo",
        "label": "Your logo"
      },
      {
        "zone": "Front",
        "layerId": "Front-phone",
        "role": "text",
        "label": "Phone number"
      },
      {
        "zone": "Front",
        "layerId": "Front-services",
        "role": "text",
        "label": "Services"
      },
      {
        "zone": "Back",
        "layerId": "Back-background",
        "role": "locked",
        "label": "Back background"
      },
      {
        "zone": "Back",
        "layerId": "Back-logo",
        "role": "logo",
        "label": "Your logo"
      },
      {
        "zone": "Back",
        "layerId": "Back-phone",
        "role": "text",
        "label": "Phone number"
      },
      {
        "zone": "Back",
        "layerId": "Back-services",
        "role": "text",
        "label": "Services"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "sleeve-flag",
        "role": "locked",
        "label": "Sleeve flag"
      }
    ],
    "previews": {
      "Front": "/assets/template-demos/3-front.png",
      "Back": "/assets/template-demos/3-back.png"
    }
  },
  {
    "id": "10000000-0000-4000-8000-000000000004",
    "template_id": "00000000-0000-4000-8000-000000000004",
    "name": "UNPUBLISHED · Pool Care Demo",
    "categories": [
      "Pool Care"
    ],
    "range": "Premium · All-over print",
    "draftStatus": "Approved background; finished shirt remains a draft.",
    "backgroundSource": "10-pool-cleaning-aqua-ripples.png",
    "payload": {
      "schema": "mqd-design-v1",
      "engine": {
        "calibration": "v26-surface-uv-collar-strip"
      },
      "product": {
        "id": "tshirt",
        "name": "All-Over Print T-Shirt",
        "category": "T-Shirts",
        "model": "https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/tshirt.glb"
      },
      "templates": {
        "Front": {
          "path": "/assets/templates/tshirt/front.png",
          "width": 3763,
          "height": 4992
        },
        "Back": {
          "path": "/assets/templates/tshirt/back.png",
          "width": 3750,
          "height": 5011
        },
        "Left Sleeve": {
          "path": "/assets/templates/tshirt/sleeve.png",
          "width": 2841,
          "height": 1702
        },
        "Right Sleeve": {
          "path": "/assets/templates/tshirt/sleeve.png",
          "width": 2841,
          "height": 1702
        },
        "Collar": {
          "path": "/assets/templates/tshirt/collar.png",
          "width": 3276,
          "height": 435
        }
      },
      "activeZone": "Front",
      "design": {
        "zones": {
          "Front": {
            "background": "#053b55",
            "layers": [
              {
                "id": "Front-background",
                "type": "image",
                "label": "Background",
                "filename": "10-pool-cleaning-aqua-ripples.png",
                "src": "/assets/template-backgrounds/10-pool-cleaning-aqua-ripples.png",
                "x": 0,
                "y": 0,
                "scale": 1,
                "rotation": 0,
                "flipX": false,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              },
              {
                "id": "Front-logo",
                "type": "image",
                "label": "Sample logo",
                "filename": "sample-logo.png",
                "src": "/assets/template-demos/sample-logo.png",
                "x": 0,
                "y": -20,
                "scale": 0.25,
                "rotation": 0,
                "flipX": false,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              },
              {
                "id": "Front-phone",
                "type": "text",
                "label": "Phone number",
                "text": "(555) 010-2026",
                "x": 0,
                "y": 14,
                "scale": 0.47,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Inter",
                "strokeColor": "#000000",
                "strokeWidth": 0,
                "bold": true,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Front-services",
                "type": "text",
                "label": "Services",
                "text": "YOUR SERVICES HERE",
                "x": 0,
                "y": 28,
                "scale": 0.35,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Inter",
                "strokeColor": "#000000",
                "strokeWidth": 0,
                "bold": true,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Back": {
            "background": "#053b55",
            "layers": [
              {
                "id": "Back-background",
                "type": "image",
                "label": "Background",
                "filename": "10-pool-cleaning-aqua-ripples.png",
                "src": "/assets/template-backgrounds/10-pool-cleaning-aqua-ripples.png",
                "x": 0,
                "y": 0,
                "scale": 1,
                "rotation": 0,
                "flipX": true,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              },
              {
                "id": "Back-logo",
                "type": "image",
                "label": "Sample logo",
                "filename": "sample-logo.png",
                "src": "/assets/template-demos/sample-logo.png",
                "x": 0,
                "y": -20,
                "scale": 0.38,
                "rotation": 0,
                "flipX": false,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              },
              {
                "id": "Back-phone",
                "type": "text",
                "label": "Phone number",
                "text": "(555) 010-2026",
                "x": 0,
                "y": 12,
                "scale": 0.47,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Inter",
                "strokeColor": "#000000",
                "strokeWidth": 0,
                "bold": true,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services",
                "type": "text",
                "label": "Services",
                "text": "YOUR SERVICES HERE",
                "x": 0,
                "y": 28,
                "scale": 0.35,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Inter",
                "strokeColor": "#000000",
                "strokeWidth": 0,
                "bold": true,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Left Sleeve": {
            "background": "#053b55",
            "layers": [
              {
                "id": "sleeve-flag",
                "type": "image",
                "label": "Sleeve flag",
                "filename": "demo-flag.png",
                "src": "/assets/template-demos/demo-flag.png",
                "x": 0,
                "y": 0,
                "scale": 0.35,
                "rotation": 0,
                "flipX": false,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              }
            ]
          },
          "Right Sleeve": {
            "background": "#053b55",
            "layers": []
          },
          "Collar": {
            "background": "#053b55",
            "layers": []
          }
        }
      }
    },
    "rules": [
      {
        "zone": "Front",
        "layerId": "Front-background",
        "role": "locked",
        "label": "Front background"
      },
      {
        "zone": "Front",
        "layerId": "Front-logo",
        "role": "logo",
        "label": "Your logo"
      },
      {
        "zone": "Front",
        "layerId": "Front-phone",
        "role": "text",
        "label": "Phone number"
      },
      {
        "zone": "Front",
        "layerId": "Front-services",
        "role": "text",
        "label": "Services"
      },
      {
        "zone": "Back",
        "layerId": "Back-background",
        "role": "locked",
        "label": "Back background"
      },
      {
        "zone": "Back",
        "layerId": "Back-logo",
        "role": "logo",
        "label": "Your logo"
      },
      {
        "zone": "Back",
        "layerId": "Back-phone",
        "role": "text",
        "label": "Phone number"
      },
      {
        "zone": "Back",
        "layerId": "Back-services",
        "role": "text",
        "label": "Services"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "sleeve-flag",
        "role": "locked",
        "label": "Sleeve flag"
      }
    ],
    "previews": {
      "Front": "/assets/template-demos/4-front.png",
      "Back": "/assets/template-demos/4-back.png"
    }
  },
  {
    "id": "10000000-0000-4000-8000-000000000005",
    "template_id": "00000000-0000-4000-8000-000000000005",
    "name": "UNPUBLISHED · Business Crew Demo",
    "categories": [
      "General Business"
    ],
    "range": "Premium · All-over print",
    "draftStatus": "Approved background; finished shirt remains a draft.",
    "backgroundSource": "14-abstract-dark-waves.jpg",
    "payload": {
      "schema": "mqd-design-v1",
      "engine": {
        "calibration": "v26-surface-uv-collar-strip"
      },
      "product": {
        "id": "tshirt",
        "name": "All-Over Print T-Shirt",
        "category": "T-Shirts",
        "model": "https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/tshirt.glb"
      },
      "templates": {
        "Front": {
          "path": "/assets/templates/tshirt/front.png",
          "width": 3763,
          "height": 4992
        },
        "Back": {
          "path": "/assets/templates/tshirt/back.png",
          "width": 3750,
          "height": 5011
        },
        "Left Sleeve": {
          "path": "/assets/templates/tshirt/sleeve.png",
          "width": 2841,
          "height": 1702
        },
        "Right Sleeve": {
          "path": "/assets/templates/tshirt/sleeve.png",
          "width": 2841,
          "height": 1702
        },
        "Collar": {
          "path": "/assets/templates/tshirt/collar.png",
          "width": 3276,
          "height": 435
        }
      },
      "activeZone": "Front",
      "design": {
        "zones": {
          "Front": {
            "background": "#282335",
            "layers": [
              {
                "id": "Front-background",
                "type": "image",
                "label": "Background",
                "filename": "14-abstract-dark-waves.jpg",
                "src": "/assets/template-backgrounds/14-abstract-dark-waves.jpg",
                "x": 0,
                "y": 0,
                "scale": 1,
                "rotation": 0,
                "flipX": false,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              },
              {
                "id": "Front-logo",
                "type": "image",
                "label": "Sample logo",
                "filename": "sample-logo.png",
                "src": "/assets/template-demos/sample-logo.png",
                "x": 0,
                "y": -20,
                "scale": 0.25,
                "rotation": 0,
                "flipX": false,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              },
              {
                "id": "Front-phone",
                "type": "text",
                "label": "Phone number",
                "text": "(555) 010-2026",
                "x": 0,
                "y": 14,
                "scale": 0.47,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Inter",
                "strokeColor": "#000000",
                "strokeWidth": 0,
                "bold": true,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Front-services",
                "type": "text",
                "label": "Services",
                "text": "YOUR SERVICES HERE",
                "x": 0,
                "y": 28,
                "scale": 0.35,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Inter",
                "strokeColor": "#000000",
                "strokeWidth": 0,
                "bold": true,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Back": {
            "background": "#282335",
            "layers": [
              {
                "id": "Back-background",
                "type": "image",
                "label": "Background",
                "filename": "14-abstract-dark-waves.jpg",
                "src": "/assets/template-backgrounds/14-abstract-dark-waves.jpg",
                "x": 0,
                "y": 0,
                "scale": 1,
                "rotation": 0,
                "flipX": true,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              },
              {
                "id": "Back-logo",
                "type": "image",
                "label": "Sample logo",
                "filename": "sample-logo.png",
                "src": "/assets/template-demos/sample-logo.png",
                "x": 0,
                "y": -20,
                "scale": 0.38,
                "rotation": 0,
                "flipX": false,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              },
              {
                "id": "Back-phone",
                "type": "text",
                "label": "Phone number",
                "text": "(555) 010-2026",
                "x": 0,
                "y": 12,
                "scale": 0.47,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Inter",
                "strokeColor": "#000000",
                "strokeWidth": 0,
                "bold": true,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services",
                "type": "text",
                "label": "Services",
                "text": "YOUR SERVICES HERE",
                "x": 0,
                "y": 28,
                "scale": 0.35,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Inter",
                "strokeColor": "#000000",
                "strokeWidth": 0,
                "bold": true,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Left Sleeve": {
            "background": "#282335",
            "layers": [
              {
                "id": "sleeve-flag",
                "type": "image",
                "label": "Sleeve flag",
                "filename": "demo-flag.png",
                "src": "/assets/template-demos/demo-flag.png",
                "x": 0,
                "y": 0,
                "scale": 0.35,
                "rotation": 0,
                "flipX": false,
                "flipY": false,
                "crop": {
                  "left": 0,
                  "top": 0,
                  "right": 0,
                  "bottom": 0
                },
                "visible": true
              }
            ]
          },
          "Right Sleeve": {
            "background": "#282335",
            "layers": []
          },
          "Collar": {
            "background": "#282335",
            "layers": []
          }
        }
      }
    },
    "rules": [
      {
        "zone": "Front",
        "layerId": "Front-background",
        "role": "locked",
        "label": "Front background"
      },
      {
        "zone": "Front",
        "layerId": "Front-logo",
        "role": "logo",
        "label": "Your logo"
      },
      {
        "zone": "Front",
        "layerId": "Front-phone",
        "role": "text",
        "label": "Phone number"
      },
      {
        "zone": "Front",
        "layerId": "Front-services",
        "role": "text",
        "label": "Services"
      },
      {
        "zone": "Back",
        "layerId": "Back-background",
        "role": "locked",
        "label": "Back background"
      },
      {
        "zone": "Back",
        "layerId": "Back-logo",
        "role": "logo",
        "label": "Your logo"
      },
      {
        "zone": "Back",
        "layerId": "Back-phone",
        "role": "text",
        "label": "Phone number"
      },
      {
        "zone": "Back",
        "layerId": "Back-services",
        "role": "text",
        "label": "Services"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "sleeve-flag",
        "role": "locked",
        "label": "Sleeve flag"
      }
    ],
    "previews": {
      "Front": "/assets/template-demos/5-front.png",
      "Back": "/assets/template-demos/5-back.png"
    }
  }
];
