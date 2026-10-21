// Fifteen unpublished review fixtures with approved background originals. Never inserted into the public catalog.
export const demoVersions=[
  {
    "id": "10000000-0000-4000-8000-000000000001",
    "template_id": "00000000-0000-4000-8000-000000000001",
    "name": "UNPUBLISHED · Pressure Wash Demo",
    "categories": [
      "Pressure Washing"
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -30,
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -48,
                "scale": 0.16,
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
                "id": "Back-social",
                "type": "image",
                "label": "Instagram • Facebook • Google",
                "filename": "social-row.png",
                "src": "/assets/template-demos/social-row.png",
                "x": 0,
                "y": -25,
                "scale": 0.055,
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
                "text": "888-888-8888",
                "x": 0,
                "y": -13,
                "scale": 0.72,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services",
                "type": "text",
                "label": "Services line 1",
                "text": "PRESSURE WASHING",
                "x": 0,
                "y": 1,
                "scale": 0.62,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-2",
                "type": "text",
                "label": "Services line 2",
                "text": "SOFT WASHING",
                "x": 0,
                "y": 12,
                "scale": 0.6,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-3",
                "type": "text",
                "label": "Services line 3",
                "text": "& MORE!",
                "x": 0,
                "y": 23,
                "scale": 0.58,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Left Sleeve": {
            "background": "#083a59",
            "layers": [
              {
                "id": "Left-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "02-pressure-washing-black-blue.jpg",
                "src": "/assets/template-backgrounds/02-pressure-washing-black-blue.jpg",
                "x": 0,
                "y": -128.91433885100443,
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
                "id": "sleeve-flag",
                "type": "image",
                "label": "Sleeve flag",
                "filename": "demo-flag.png",
                "src": "/assets/template-demos/demo-flag.png",
                "x": 0,
                "y": 0,
                "scale": 0.2,
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
            "layers": [
              {
                "id": "Right-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "02-pressure-washing-black-blue.jpg",
                "src": "/assets/template-backgrounds/02-pressure-washing-black-blue.jpg",
                "x": 0,
                "y": -128.91433885100443,
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
              }
            ]
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
        "layerId": "Back-social",
        "role": "artwork",
        "label": "Social icons"
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
        "label": "Services line 1"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-2",
        "role": "text",
        "label": "Services line 2"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-3",
        "role": "text",
        "label": "Services line 3"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "Left-Sleeve-background",
        "role": "locked",
        "label": "Left Sleeve background"
      },
      {
        "zone": "Right Sleeve",
        "layerId": "Right-Sleeve-background",
        "role": "locked",
        "label": "Right Sleeve background"
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
      "Back": "/assets/template-demos/1-back.png",
      "Left Sleeve": "/assets/template-demos/1-left-sleeve.png",
      "Right Sleeve": "/assets/template-demos/1-right-sleeve.png"
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -30,
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -48,
                "scale": 0.16,
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
                "id": "Back-social",
                "type": "image",
                "label": "Instagram • Facebook • Google",
                "filename": "social-row.png",
                "src": "/assets/template-demos/social-row.png",
                "x": 0,
                "y": -25,
                "scale": 0.055,
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
                "text": "888-888-8888",
                "x": 0,
                "y": -13,
                "scale": 0.72,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#173a2b",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services",
                "type": "text",
                "label": "Services line 1",
                "text": "LAWN MOWING",
                "x": 0,
                "y": 1,
                "scale": 0.62,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#173a2b",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-2",
                "type": "text",
                "label": "Services line 2",
                "text": "TRIMMING",
                "x": 0,
                "y": 12,
                "scale": 0.6,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#173a2b",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-3",
                "type": "text",
                "label": "Services line 3",
                "text": "& MORE!",
                "x": 0,
                "y": 23,
                "scale": 0.58,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#173a2b",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Left Sleeve": {
            "background": "#173a2b",
            "layers": [
              {
                "id": "Left-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "07-landscaping-fresh-lawn.png",
                "src": "/assets/template-backgrounds/07-landscaping-fresh-lawn.png",
                "x": 0,
                "y": -128.91433885100443,
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
                "id": "sleeve-flag",
                "type": "image",
                "label": "Sleeve flag",
                "filename": "demo-flag.png",
                "src": "/assets/template-demos/demo-flag.png",
                "x": 0,
                "y": 0,
                "scale": 0.2,
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
            "layers": [
              {
                "id": "Right-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "07-landscaping-fresh-lawn.png",
                "src": "/assets/template-backgrounds/07-landscaping-fresh-lawn.png",
                "x": 0,
                "y": -128.91433885100443,
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
              }
            ]
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
        "layerId": "Back-social",
        "role": "artwork",
        "label": "Social icons"
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
        "label": "Services line 1"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-2",
        "role": "text",
        "label": "Services line 2"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-3",
        "role": "text",
        "label": "Services line 3"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "Left-Sleeve-background",
        "role": "locked",
        "label": "Left Sleeve background"
      },
      {
        "zone": "Right Sleeve",
        "layerId": "Right-Sleeve-background",
        "role": "locked",
        "label": "Right Sleeve background"
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
      "Back": "/assets/template-demos/2-back.png",
      "Left Sleeve": "/assets/template-demos/2-left-sleeve.png",
      "Right Sleeve": "/assets/template-demos/2-right-sleeve.png"
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -30,
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -48,
                "scale": 0.16,
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
                "id": "Back-social",
                "type": "image",
                "label": "Instagram • Facebook • Google",
                "filename": "social-row.png",
                "src": "/assets/template-demos/social-row.png",
                "x": 0,
                "y": -25,
                "scale": 0.055,
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
                "text": "888-888-8888",
                "x": 0,
                "y": -13,
                "scale": 0.72,
                "rotation": 0,
                "visible": true,
                "color": "#10243B",
                "font": "Impact",
                "strokeColor": "#202e4c",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services",
                "type": "text",
                "label": "Services line 1",
                "text": "HEATING",
                "x": 0,
                "y": 1,
                "scale": 0.62,
                "rotation": 0,
                "visible": true,
                "color": "#10243B",
                "font": "Impact",
                "strokeColor": "#202e4c",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-2",
                "type": "text",
                "label": "Services line 2",
                "text": "COOLING",
                "x": 0,
                "y": 12,
                "scale": 0.6,
                "rotation": 0,
                "visible": true,
                "color": "#10243B",
                "font": "Impact",
                "strokeColor": "#202e4c",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-3",
                "type": "text",
                "label": "Services line 3",
                "text": "& MORE!",
                "x": 0,
                "y": 23,
                "scale": 0.58,
                "rotation": 0,
                "visible": true,
                "color": "#10243B",
                "font": "Impact",
                "strokeColor": "#202e4c",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Left Sleeve": {
            "background": "#202e4c",
            "layers": [
              {
                "id": "Left-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "13-abstract-blue-flow.jpg",
                "src": "/assets/template-backgrounds/13-abstract-blue-flow.jpg",
                "x": 0,
                "y": -128.91433885100443,
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
                "id": "sleeve-flag",
                "type": "image",
                "label": "Sleeve flag",
                "filename": "demo-flag.png",
                "src": "/assets/template-demos/demo-flag.png",
                "x": 0,
                "y": 0,
                "scale": 0.2,
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
            "layers": [
              {
                "id": "Right-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "13-abstract-blue-flow.jpg",
                "src": "/assets/template-backgrounds/13-abstract-blue-flow.jpg",
                "x": 0,
                "y": -128.91433885100443,
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
              }
            ]
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
        "layerId": "Back-social",
        "role": "artwork",
        "label": "Social icons"
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
        "label": "Services line 1"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-2",
        "role": "text",
        "label": "Services line 2"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-3",
        "role": "text",
        "label": "Services line 3"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "Left-Sleeve-background",
        "role": "locked",
        "label": "Left Sleeve background"
      },
      {
        "zone": "Right Sleeve",
        "layerId": "Right-Sleeve-background",
        "role": "locked",
        "label": "Right Sleeve background"
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
      "Back": "/assets/template-demos/3-back.png",
      "Left Sleeve": "/assets/template-demos/3-left-sleeve.png",
      "Right Sleeve": "/assets/template-demos/3-right-sleeve.png"
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -30,
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -48,
                "scale": 0.16,
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
                "id": "Back-social",
                "type": "image",
                "label": "Instagram • Facebook • Google",
                "filename": "social-row.png",
                "src": "/assets/template-demos/social-row.png",
                "x": 0,
                "y": -25,
                "scale": 0.055,
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
                "text": "888-888-8888",
                "x": 0,
                "y": -13,
                "scale": 0.72,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#053b55",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services",
                "type": "text",
                "label": "Services line 1",
                "text": "POOL CLEANING",
                "x": 0,
                "y": 1,
                "scale": 0.62,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#053b55",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-2",
                "type": "text",
                "label": "Services line 2",
                "text": "WATER CARE",
                "x": 0,
                "y": 12,
                "scale": 0.6,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#053b55",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-3",
                "type": "text",
                "label": "Services line 3",
                "text": "& MORE!",
                "x": 0,
                "y": 23,
                "scale": 0.58,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#053b55",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Left Sleeve": {
            "background": "#053b55",
            "layers": [
              {
                "id": "Left-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "10-pool-cleaning-aqua-ripples.png",
                "src": "/assets/template-backgrounds/10-pool-cleaning-aqua-ripples.png",
                "x": 0,
                "y": -128.91433885100443,
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
                "id": "sleeve-flag",
                "type": "image",
                "label": "Sleeve flag",
                "filename": "demo-flag.png",
                "src": "/assets/template-demos/demo-flag.png",
                "x": 0,
                "y": 0,
                "scale": 0.2,
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
            "layers": [
              {
                "id": "Right-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "10-pool-cleaning-aqua-ripples.png",
                "src": "/assets/template-backgrounds/10-pool-cleaning-aqua-ripples.png",
                "x": 0,
                "y": -128.91433885100443,
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
              }
            ]
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
        "layerId": "Back-social",
        "role": "artwork",
        "label": "Social icons"
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
        "label": "Services line 1"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-2",
        "role": "text",
        "label": "Services line 2"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-3",
        "role": "text",
        "label": "Services line 3"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "Left-Sleeve-background",
        "role": "locked",
        "label": "Left Sleeve background"
      },
      {
        "zone": "Right Sleeve",
        "layerId": "Right-Sleeve-background",
        "role": "locked",
        "label": "Right Sleeve background"
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
      "Back": "/assets/template-demos/4-back.png",
      "Left Sleeve": "/assets/template-demos/4-left-sleeve.png",
      "Right Sleeve": "/assets/template-demos/4-right-sleeve.png"
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -30,
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -48,
                "scale": 0.16,
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
                "id": "Back-social",
                "type": "image",
                "label": "Instagram • Facebook • Google",
                "filename": "social-row.png",
                "src": "/assets/template-demos/social-row.png",
                "x": 0,
                "y": -25,
                "scale": 0.055,
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
                "text": "888-888-8888",
                "x": 0,
                "y": -13,
                "scale": 0.72,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#282335",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services",
                "type": "text",
                "label": "Services line 1",
                "text": "YOUR BUSINESS SERVICES",
                "x": 0,
                "y": 1,
                "scale": 0.62,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#282335",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-2",
                "type": "text",
                "label": "Services line 2",
                "text": "QUALITY SERVICE",
                "x": 0,
                "y": 12,
                "scale": 0.6,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#282335",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-3",
                "type": "text",
                "label": "Services line 3",
                "text": "& MORE!",
                "x": 0,
                "y": 23,
                "scale": 0.58,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#282335",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Left Sleeve": {
            "background": "#282335",
            "layers": [
              {
                "id": "Left-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "14-abstract-dark-waves.jpg",
                "src": "/assets/template-backgrounds/14-abstract-dark-waves.jpg",
                "x": 0,
                "y": -128.91433885100443,
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
                "id": "sleeve-flag",
                "type": "image",
                "label": "Sleeve flag",
                "filename": "demo-flag.png",
                "src": "/assets/template-demos/demo-flag.png",
                "x": 0,
                "y": 0,
                "scale": 0.2,
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
            "layers": [
              {
                "id": "Right-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "14-abstract-dark-waves.jpg",
                "src": "/assets/template-backgrounds/14-abstract-dark-waves.jpg",
                "x": 0,
                "y": -128.91433885100443,
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
              }
            ]
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
        "layerId": "Back-social",
        "role": "artwork",
        "label": "Social icons"
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
        "label": "Services line 1"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-2",
        "role": "text",
        "label": "Services line 2"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-3",
        "role": "text",
        "label": "Services line 3"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "Left-Sleeve-background",
        "role": "locked",
        "label": "Left Sleeve background"
      },
      {
        "zone": "Right Sleeve",
        "layerId": "Right-Sleeve-background",
        "role": "locked",
        "label": "Right Sleeve background"
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
      "Back": "/assets/template-demos/5-back.png",
      "Left Sleeve": "/assets/template-demos/5-left-sleeve.png",
      "Right Sleeve": "/assets/template-demos/5-right-sleeve.png"
    }
  },
  {
    "id": "10000000-0000-4000-8000-000000000006",
    "template_id": "00000000-0000-4000-8000-000000000006",
    "name": "UNPUBLISHED · Pressure Wash · Ice Blue Demo",
    "categories": [
      "Pressure Washing"
    ],
    "range": "Premium · All-over print",
    "draftStatus": "Approved background with black contact text; unpublished draft.",
    "backgroundSource": "01-pressure-washing-ice-blue.jpg",
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
                "filename": "01-pressure-washing-ice-blue.jpg",
                "src": "/assets/template-backgrounds/01-pressure-washing-ice-blue.jpg",
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -30,
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
                "filename": "01-pressure-washing-ice-blue.jpg",
                "src": "/assets/template-backgrounds/01-pressure-washing-ice-blue.jpg",
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -48,
                "scale": 0.16,
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
                "id": "Back-social",
                "type": "image",
                "label": "Instagram • Facebook • Google",
                "filename": "social-row.png",
                "src": "/assets/template-demos/social-row.png",
                "x": 0,
                "y": -25,
                "scale": 0.055,
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
                "text": "888-888-8888",
                "x": 0,
                "y": -13,
                "scale": 0.72,
                "rotation": 0,
                "visible": true,
                "color": "#000000",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services",
                "type": "text",
                "label": "Services line 1",
                "text": "PRESSURE WASHING",
                "x": 0,
                "y": 1,
                "scale": 0.62,
                "rotation": 0,
                "visible": true,
                "color": "#000000",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-2",
                "type": "text",
                "label": "Services line 2",
                "text": "SOFT WASHING",
                "x": 0,
                "y": 12,
                "scale": 0.6,
                "rotation": 0,
                "visible": true,
                "color": "#000000",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-3",
                "type": "text",
                "label": "Services line 3",
                "text": "& MORE!",
                "x": 0,
                "y": 23,
                "scale": 0.58,
                "rotation": 0,
                "visible": true,
                "color": "#000000",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Left Sleeve": {
            "background": "#083a59",
            "layers": [
              {
                "id": "Left-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "01-pressure-washing-ice-blue.jpg",
                "src": "/assets/template-backgrounds/01-pressure-washing-ice-blue.jpg",
                "x": 0,
                "y": -128.91433885100443,
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
                "id": "sleeve-flag",
                "type": "image",
                "label": "Sleeve flag",
                "filename": "demo-flag.png",
                "src": "/assets/template-demos/demo-flag.png",
                "x": 0,
                "y": 0,
                "scale": 0.2,
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
            "layers": [
              {
                "id": "Right-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "01-pressure-washing-ice-blue.jpg",
                "src": "/assets/template-backgrounds/01-pressure-washing-ice-blue.jpg",
                "x": 0,
                "y": -128.91433885100443,
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
              }
            ]
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
        "layerId": "Back-social",
        "role": "artwork",
        "label": "Social icons"
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
        "label": "Services line 1"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-2",
        "role": "text",
        "label": "Services line 2"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-3",
        "role": "text",
        "label": "Services line 3"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "Left-Sleeve-background",
        "role": "locked",
        "label": "Left Sleeve background"
      },
      {
        "zone": "Right Sleeve",
        "layerId": "Right-Sleeve-background",
        "role": "locked",
        "label": "Right Sleeve background"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "sleeve-flag",
        "role": "locked",
        "label": "Sleeve flag"
      }
    ],
    "previews": {
      "Front": "/assets/template-demos/6-front.png",
      "Back": "/assets/template-demos/6-back.png",
      "Left Sleeve": "/assets/template-demos/6-left-sleeve.png",
      "Right Sleeve": "/assets/template-demos/6-right-sleeve.png"
    }
  },
  {
    "id": "10000000-0000-4000-8000-000000000007",
    "template_id": "00000000-0000-4000-8000-000000000007",
    "name": "UNPUBLISHED · Pressure Wash · Ocean Blue Demo",
    "categories": [
      "Pressure Washing"
    ],
    "range": "Premium · All-over print",
    "draftStatus": "Approved background; finished shirt remains a draft.",
    "backgroundSource": "03-pressure-washing-ocean-blue.jpg",
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
                "filename": "03-pressure-washing-ocean-blue.jpg",
                "src": "/assets/template-backgrounds/03-pressure-washing-ocean-blue.jpg",
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -30,
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
                "filename": "03-pressure-washing-ocean-blue.jpg",
                "src": "/assets/template-backgrounds/03-pressure-washing-ocean-blue.jpg",
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -48,
                "scale": 0.16,
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
                "id": "Back-social",
                "type": "image",
                "label": "Instagram • Facebook • Google",
                "filename": "social-row.png",
                "src": "/assets/template-demos/social-row.png",
                "x": 0,
                "y": -25,
                "scale": 0.055,
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
                "text": "888-888-8888",
                "x": 0,
                "y": -13,
                "scale": 0.72,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services",
                "type": "text",
                "label": "Services line 1",
                "text": "PRESSURE WASHING",
                "x": 0,
                "y": 1,
                "scale": 0.62,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-2",
                "type": "text",
                "label": "Services line 2",
                "text": "SOFT WASHING",
                "x": 0,
                "y": 12,
                "scale": 0.6,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-3",
                "type": "text",
                "label": "Services line 3",
                "text": "& MORE!",
                "x": 0,
                "y": 23,
                "scale": 0.58,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Left Sleeve": {
            "background": "#083a59",
            "layers": [
              {
                "id": "Left-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "03-pressure-washing-ocean-blue.jpg",
                "src": "/assets/template-backgrounds/03-pressure-washing-ocean-blue.jpg",
                "x": 0,
                "y": -128.91433885100443,
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
                "id": "sleeve-flag",
                "type": "image",
                "label": "Sleeve flag",
                "filename": "demo-flag.png",
                "src": "/assets/template-demos/demo-flag.png",
                "x": 0,
                "y": 0,
                "scale": 0.2,
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
            "layers": [
              {
                "id": "Right-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "03-pressure-washing-ocean-blue.jpg",
                "src": "/assets/template-backgrounds/03-pressure-washing-ocean-blue.jpg",
                "x": 0,
                "y": -128.91433885100443,
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
              }
            ]
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
        "layerId": "Back-social",
        "role": "artwork",
        "label": "Social icons"
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
        "label": "Services line 1"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-2",
        "role": "text",
        "label": "Services line 2"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-3",
        "role": "text",
        "label": "Services line 3"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "Left-Sleeve-background",
        "role": "locked",
        "label": "Left Sleeve background"
      },
      {
        "zone": "Right Sleeve",
        "layerId": "Right-Sleeve-background",
        "role": "locked",
        "label": "Right Sleeve background"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "sleeve-flag",
        "role": "locked",
        "label": "Sleeve flag"
      }
    ],
    "previews": {
      "Front": "/assets/template-demos/7-front.png",
      "Back": "/assets/template-demos/7-back.png",
      "Left Sleeve": "/assets/template-demos/7-left-sleeve.png",
      "Right Sleeve": "/assets/template-demos/7-right-sleeve.png"
    }
  },
  {
    "id": "10000000-0000-4000-8000-000000000008",
    "template_id": "00000000-0000-4000-8000-000000000008",
    "name": "UNPUBLISHED · Pressure Wash · American Classic Demo",
    "categories": [
      "Pressure Washing"
    ],
    "range": "Premium · All-over print",
    "draftStatus": "Patriotic layout approved without mirroring or seam matching; unpublished draft.",
    "backgroundSource": "04-pressure-washing-american-classic.jpg",
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
                "filename": "04-pressure-washing-american-classic.jpg",
                "src": "/assets/template-backgrounds/04-pressure-washing-american-classic.jpg",
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -30,
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
                "filename": "04-pressure-washing-american-classic.jpg",
                "src": "/assets/template-backgrounds/04-pressure-washing-american-classic.jpg",
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
                "id": "Back-logo",
                "type": "image",
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -48,
                "scale": 0.16,
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
                "id": "Back-social",
                "type": "image",
                "label": "Instagram • Facebook • Google",
                "filename": "social-row.png",
                "src": "/assets/template-demos/social-row.png",
                "x": 0,
                "y": -25,
                "scale": 0.055,
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
                "text": "888-888-8888",
                "x": 0,
                "y": -13,
                "scale": 0.72,
                "rotation": 0,
                "visible": true,
                "color": "#000000",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services",
                "type": "text",
                "label": "Services line 1",
                "text": "PRESSURE WASHING",
                "x": 0,
                "y": 1,
                "scale": 0.62,
                "rotation": 0,
                "visible": true,
                "color": "#000000",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-2",
                "type": "text",
                "label": "Services line 2",
                "text": "SOFT WASHING",
                "x": 0,
                "y": 12,
                "scale": 0.6,
                "rotation": 0,
                "visible": true,
                "color": "#000000",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-3",
                "type": "text",
                "label": "Services line 3",
                "text": "& MORE!",
                "x": 0,
                "y": 23,
                "scale": 0.58,
                "rotation": 0,
                "visible": true,
                "color": "#000000",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Left Sleeve": {
            "background": "#083a59",
            "layers": [
              {
                "id": "Left-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "04-pressure-washing-american-classic.jpg",
                "src": "/assets/template-backgrounds/04-pressure-washing-american-classic.jpg",
                "x": 0,
                "y": -128.91433885100443,
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
                "id": "sleeve-flag",
                "type": "image",
                "label": "Sleeve flag",
                "filename": "demo-flag.png",
                "src": "/assets/template-demos/demo-flag.png",
                "x": 0,
                "y": 0,
                "scale": 0.2,
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
            "layers": [
              {
                "id": "Right-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "04-pressure-washing-american-classic.jpg",
                "src": "/assets/template-backgrounds/04-pressure-washing-american-classic.jpg",
                "x": 0,
                "y": -128.91433885100443,
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
              }
            ]
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
        "layerId": "Back-social",
        "role": "artwork",
        "label": "Social icons"
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
        "label": "Services line 1"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-2",
        "role": "text",
        "label": "Services line 2"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-3",
        "role": "text",
        "label": "Services line 3"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "Left-Sleeve-background",
        "role": "locked",
        "label": "Left Sleeve background"
      },
      {
        "zone": "Right Sleeve",
        "layerId": "Right-Sleeve-background",
        "role": "locked",
        "label": "Right Sleeve background"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "sleeve-flag",
        "role": "locked",
        "label": "Sleeve flag"
      }
    ],
    "previews": {
      "Front": "/assets/template-demos/8-front.png",
      "Back": "/assets/template-demos/8-back.png",
      "Left Sleeve": "/assets/template-demos/8-left-sleeve.png",
      "Right Sleeve": "/assets/template-demos/8-right-sleeve.png"
    }
  },
  {
    "id": "10000000-0000-4000-8000-000000000009",
    "template_id": "00000000-0000-4000-8000-000000000009",
    "name": "UNPUBLISHED · Pressure Wash · American Dark Demo",
    "categories": [
      "Pressure Washing"
    ],
    "range": "Premium · All-over print",
    "draftStatus": "Patriotic layout approved without mirroring or seam matching; unpublished draft.",
    "backgroundSource": "05-pressure-washing-american-dark.jpg",
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
                "filename": "05-pressure-washing-american-dark.jpg",
                "src": "/assets/template-backgrounds/05-pressure-washing-american-dark.jpg",
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -30,
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
                "filename": "05-pressure-washing-american-dark.jpg",
                "src": "/assets/template-backgrounds/05-pressure-washing-american-dark.jpg",
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
                "id": "Back-logo",
                "type": "image",
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -48,
                "scale": 0.16,
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
                "id": "Back-social",
                "type": "image",
                "label": "Instagram • Facebook • Google",
                "filename": "social-row.png",
                "src": "/assets/template-demos/social-row.png",
                "x": 0,
                "y": -25,
                "scale": 0.055,
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
                "text": "888-888-8888",
                "x": 0,
                "y": -13,
                "scale": 0.72,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services",
                "type": "text",
                "label": "Services line 1",
                "text": "PRESSURE WASHING",
                "x": 0,
                "y": 1,
                "scale": 0.62,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-2",
                "type": "text",
                "label": "Services line 2",
                "text": "SOFT WASHING",
                "x": 0,
                "y": 12,
                "scale": 0.6,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-3",
                "type": "text",
                "label": "Services line 3",
                "text": "& MORE!",
                "x": 0,
                "y": 23,
                "scale": 0.58,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Left Sleeve": {
            "background": "#083a59",
            "layers": [
              {
                "id": "Left-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "05-pressure-washing-american-dark.jpg",
                "src": "/assets/template-backgrounds/05-pressure-washing-american-dark.jpg",
                "x": 0,
                "y": -128.91433885100443,
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
                "id": "sleeve-flag",
                "type": "image",
                "label": "Sleeve flag",
                "filename": "demo-flag.png",
                "src": "/assets/template-demos/demo-flag.png",
                "x": 0,
                "y": 0,
                "scale": 0.2,
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
            "layers": [
              {
                "id": "Right-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "05-pressure-washing-american-dark.jpg",
                "src": "/assets/template-backgrounds/05-pressure-washing-american-dark.jpg",
                "x": 0,
                "y": -128.91433885100443,
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
              }
            ]
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
        "layerId": "Back-social",
        "role": "artwork",
        "label": "Social icons"
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
        "label": "Services line 1"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-2",
        "role": "text",
        "label": "Services line 2"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-3",
        "role": "text",
        "label": "Services line 3"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "Left-Sleeve-background",
        "role": "locked",
        "label": "Left Sleeve background"
      },
      {
        "zone": "Right Sleeve",
        "layerId": "Right-Sleeve-background",
        "role": "locked",
        "label": "Right Sleeve background"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "sleeve-flag",
        "role": "locked",
        "label": "Sleeve flag"
      }
    ],
    "previews": {
      "Front": "/assets/template-demos/9-front.png",
      "Back": "/assets/template-demos/9-back.png",
      "Left Sleeve": "/assets/template-demos/9-left-sleeve.png",
      "Right Sleeve": "/assets/template-demos/9-right-sleeve.png"
    }
  },
  {
    "id": "10000000-0000-4000-8000-000000000010",
    "template_id": "00000000-0000-4000-8000-000000000010",
    "name": "UNPUBLISHED · Pressure Wash · American Bright Demo",
    "categories": [
      "Pressure Washing"
    ],
    "range": "Premium · All-over print",
    "draftStatus": "Patriotic layout approved without mirroring or seam matching; unpublished draft.",
    "backgroundSource": "06-pressure-washing-american-bright.jpg",
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
                "filename": "06-pressure-washing-american-bright.jpg",
                "src": "/assets/template-backgrounds/06-pressure-washing-american-bright.jpg",
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -30,
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
                "filename": "06-pressure-washing-american-bright.jpg",
                "src": "/assets/template-backgrounds/06-pressure-washing-american-bright.jpg",
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
                "id": "Back-logo",
                "type": "image",
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -48,
                "scale": 0.16,
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
                "id": "Back-social",
                "type": "image",
                "label": "Instagram • Facebook • Google",
                "filename": "social-row.png",
                "src": "/assets/template-demos/social-row.png",
                "x": 0,
                "y": -25,
                "scale": 0.055,
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
                "text": "888-888-8888",
                "x": 0,
                "y": -13,
                "scale": 0.72,
                "rotation": 0,
                "visible": true,
                "color": "#000000",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services",
                "type": "text",
                "label": "Services line 1",
                "text": "PRESSURE WASHING",
                "x": 0,
                "y": 1,
                "scale": 0.62,
                "rotation": 0,
                "visible": true,
                "color": "#000000",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-2",
                "type": "text",
                "label": "Services line 2",
                "text": "SOFT WASHING",
                "x": 0,
                "y": 12,
                "scale": 0.6,
                "rotation": 0,
                "visible": true,
                "color": "#000000",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-3",
                "type": "text",
                "label": "Services line 3",
                "text": "& MORE!",
                "x": 0,
                "y": 23,
                "scale": 0.58,
                "rotation": 0,
                "visible": true,
                "color": "#000000",
                "font": "Impact",
                "strokeColor": "#083a59",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Left Sleeve": {
            "background": "#083a59",
            "layers": [
              {
                "id": "Left-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "06-pressure-washing-american-bright.jpg",
                "src": "/assets/template-backgrounds/06-pressure-washing-american-bright.jpg",
                "x": 0,
                "y": -128.91433885100443,
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
                "id": "sleeve-flag",
                "type": "image",
                "label": "Sleeve flag",
                "filename": "demo-flag.png",
                "src": "/assets/template-demos/demo-flag.png",
                "x": 0,
                "y": 0,
                "scale": 0.2,
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
            "layers": [
              {
                "id": "Right-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "06-pressure-washing-american-bright.jpg",
                "src": "/assets/template-backgrounds/06-pressure-washing-american-bright.jpg",
                "x": 0,
                "y": -128.91433885100443,
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
              }
            ]
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
        "layerId": "Back-social",
        "role": "artwork",
        "label": "Social icons"
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
        "label": "Services line 1"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-2",
        "role": "text",
        "label": "Services line 2"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-3",
        "role": "text",
        "label": "Services line 3"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "Left-Sleeve-background",
        "role": "locked",
        "label": "Left Sleeve background"
      },
      {
        "zone": "Right Sleeve",
        "layerId": "Right-Sleeve-background",
        "role": "locked",
        "label": "Right Sleeve background"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "sleeve-flag",
        "role": "locked",
        "label": "Sleeve flag"
      }
    ],
    "previews": {
      "Front": "/assets/template-demos/10-front.png",
      "Back": "/assets/template-demos/10-back.png",
      "Left Sleeve": "/assets/template-demos/10-left-sleeve.png",
      "Right Sleeve": "/assets/template-demos/10-right-sleeve.png"
    }
  },
  {
    "id": "10000000-0000-4000-8000-000000000011",
    "template_id": "00000000-0000-4000-8000-000000000011",
    "name": "UNPUBLISHED · Lawn Crew · Dewy Grass Demo",
    "categories": [
      "Lawn Care"
    ],
    "range": "Premium · All-over print",
    "draftStatus": "Approved background; finished shirt remains a draft.",
    "backgroundSource": "08-landscaping-dewy-grass.png",
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
                "filename": "08-landscaping-dewy-grass.png",
                "src": "/assets/template-backgrounds/08-landscaping-dewy-grass.png",
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -30,
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
                "filename": "08-landscaping-dewy-grass.png",
                "src": "/assets/template-backgrounds/08-landscaping-dewy-grass.png",
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -48,
                "scale": 0.16,
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
                "id": "Back-social",
                "type": "image",
                "label": "Instagram • Facebook • Google",
                "filename": "social-row.png",
                "src": "/assets/template-demos/social-row.png",
                "x": 0,
                "y": -25,
                "scale": 0.055,
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
                "text": "888-888-8888",
                "x": 0,
                "y": -13,
                "scale": 0.72,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#173a2b",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services",
                "type": "text",
                "label": "Services line 1",
                "text": "LAWN MOWING",
                "x": 0,
                "y": 1,
                "scale": 0.62,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#173a2b",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-2",
                "type": "text",
                "label": "Services line 2",
                "text": "TRIMMING",
                "x": 0,
                "y": 12,
                "scale": 0.6,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#173a2b",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-3",
                "type": "text",
                "label": "Services line 3",
                "text": "& MORE!",
                "x": 0,
                "y": 23,
                "scale": 0.58,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#173a2b",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Left Sleeve": {
            "background": "#173a2b",
            "layers": [
              {
                "id": "Left-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "08-landscaping-dewy-grass.png",
                "src": "/assets/template-backgrounds/08-landscaping-dewy-grass.png",
                "x": 0,
                "y": -128.91433885100443,
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
                "id": "sleeve-flag",
                "type": "image",
                "label": "Sleeve flag",
                "filename": "demo-flag.png",
                "src": "/assets/template-demos/demo-flag.png",
                "x": 0,
                "y": 0,
                "scale": 0.2,
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
            "layers": [
              {
                "id": "Right-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "08-landscaping-dewy-grass.png",
                "src": "/assets/template-backgrounds/08-landscaping-dewy-grass.png",
                "x": 0,
                "y": -128.91433885100443,
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
              }
            ]
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
        "layerId": "Back-social",
        "role": "artwork",
        "label": "Social icons"
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
        "label": "Services line 1"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-2",
        "role": "text",
        "label": "Services line 2"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-3",
        "role": "text",
        "label": "Services line 3"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "Left-Sleeve-background",
        "role": "locked",
        "label": "Left Sleeve background"
      },
      {
        "zone": "Right Sleeve",
        "layerId": "Right-Sleeve-background",
        "role": "locked",
        "label": "Right Sleeve background"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "sleeve-flag",
        "role": "locked",
        "label": "Sleeve flag"
      }
    ],
    "previews": {
      "Front": "/assets/template-demos/11-front.png",
      "Back": "/assets/template-demos/11-back.png",
      "Left Sleeve": "/assets/template-demos/11-left-sleeve.png",
      "Right Sleeve": "/assets/template-demos/11-right-sleeve.png"
    }
  },
  {
    "id": "10000000-0000-4000-8000-000000000012",
    "template_id": "00000000-0000-4000-8000-000000000012",
    "name": "UNPUBLISHED · Lawn Crew · Sunlit Clippings Demo",
    "categories": [
      "Lawn Care"
    ],
    "range": "Premium · All-over print",
    "draftStatus": "Approved background; finished shirt remains a draft.",
    "backgroundSource": "09-landscaping-sunlit-clippings.png",
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
                "filename": "09-landscaping-sunlit-clippings.png",
                "src": "/assets/template-backgrounds/09-landscaping-sunlit-clippings.png",
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -30,
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
                "filename": "09-landscaping-sunlit-clippings.png",
                "src": "/assets/template-backgrounds/09-landscaping-sunlit-clippings.png",
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -48,
                "scale": 0.16,
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
                "id": "Back-social",
                "type": "image",
                "label": "Instagram • Facebook • Google",
                "filename": "social-row.png",
                "src": "/assets/template-demos/social-row.png",
                "x": 0,
                "y": -25,
                "scale": 0.055,
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
                "text": "888-888-8888",
                "x": 0,
                "y": -13,
                "scale": 0.72,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#173a2b",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services",
                "type": "text",
                "label": "Services line 1",
                "text": "LAWN MOWING",
                "x": 0,
                "y": 1,
                "scale": 0.62,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#173a2b",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-2",
                "type": "text",
                "label": "Services line 2",
                "text": "TRIMMING",
                "x": 0,
                "y": 12,
                "scale": 0.6,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#173a2b",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-3",
                "type": "text",
                "label": "Services line 3",
                "text": "& MORE!",
                "x": 0,
                "y": 23,
                "scale": 0.58,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#173a2b",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Left Sleeve": {
            "background": "#173a2b",
            "layers": [
              {
                "id": "Left-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "09-landscaping-sunlit-clippings.png",
                "src": "/assets/template-backgrounds/09-landscaping-sunlit-clippings.png",
                "x": 0,
                "y": -128.91433885100443,
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
                "id": "sleeve-flag",
                "type": "image",
                "label": "Sleeve flag",
                "filename": "demo-flag.png",
                "src": "/assets/template-demos/demo-flag.png",
                "x": 0,
                "y": 0,
                "scale": 0.2,
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
            "layers": [
              {
                "id": "Right-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "09-landscaping-sunlit-clippings.png",
                "src": "/assets/template-backgrounds/09-landscaping-sunlit-clippings.png",
                "x": 0,
                "y": -128.91433885100443,
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
              }
            ]
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
        "layerId": "Back-social",
        "role": "artwork",
        "label": "Social icons"
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
        "label": "Services line 1"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-2",
        "role": "text",
        "label": "Services line 2"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-3",
        "role": "text",
        "label": "Services line 3"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "Left-Sleeve-background",
        "role": "locked",
        "label": "Left Sleeve background"
      },
      {
        "zone": "Right Sleeve",
        "layerId": "Right-Sleeve-background",
        "role": "locked",
        "label": "Right Sleeve background"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "sleeve-flag",
        "role": "locked",
        "label": "Sleeve flag"
      }
    ],
    "previews": {
      "Front": "/assets/template-demos/12-front.png",
      "Back": "/assets/template-demos/12-back.png",
      "Left Sleeve": "/assets/template-demos/12-left-sleeve.png",
      "Right Sleeve": "/assets/template-demos/12-right-sleeve.png"
    }
  },
  {
    "id": "10000000-0000-4000-8000-000000000013",
    "template_id": "00000000-0000-4000-8000-000000000013",
    "name": "UNPUBLISHED · Pool Care · Deep Blue Demo",
    "categories": [
      "Pool Care"
    ],
    "range": "Premium · All-over print",
    "draftStatus": "Approved background; finished shirt remains a draft.",
    "backgroundSource": "11-pool-cleaning-deep-blue.png",
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
                "filename": "11-pool-cleaning-deep-blue.png",
                "src": "/assets/template-backgrounds/11-pool-cleaning-deep-blue.png",
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -30,
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
                "filename": "11-pool-cleaning-deep-blue.png",
                "src": "/assets/template-backgrounds/11-pool-cleaning-deep-blue.png",
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -48,
                "scale": 0.16,
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
                "id": "Back-social",
                "type": "image",
                "label": "Instagram • Facebook • Google",
                "filename": "social-row.png",
                "src": "/assets/template-demos/social-row.png",
                "x": 0,
                "y": -25,
                "scale": 0.055,
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
                "text": "888-888-8888",
                "x": 0,
                "y": -13,
                "scale": 0.72,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#053b55",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services",
                "type": "text",
                "label": "Services line 1",
                "text": "POOL CLEANING",
                "x": 0,
                "y": 1,
                "scale": 0.62,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#053b55",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-2",
                "type": "text",
                "label": "Services line 2",
                "text": "WATER CARE",
                "x": 0,
                "y": 12,
                "scale": 0.6,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#053b55",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-3",
                "type": "text",
                "label": "Services line 3",
                "text": "& MORE!",
                "x": 0,
                "y": 23,
                "scale": 0.58,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#053b55",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Left Sleeve": {
            "background": "#053b55",
            "layers": [
              {
                "id": "Left-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "11-pool-cleaning-deep-blue.png",
                "src": "/assets/template-backgrounds/11-pool-cleaning-deep-blue.png",
                "x": 0,
                "y": -128.91433885100443,
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
                "id": "sleeve-flag",
                "type": "image",
                "label": "Sleeve flag",
                "filename": "demo-flag.png",
                "src": "/assets/template-demos/demo-flag.png",
                "x": 0,
                "y": 0,
                "scale": 0.2,
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
            "layers": [
              {
                "id": "Right-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "11-pool-cleaning-deep-blue.png",
                "src": "/assets/template-backgrounds/11-pool-cleaning-deep-blue.png",
                "x": 0,
                "y": -128.91433885100443,
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
              }
            ]
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
        "layerId": "Back-social",
        "role": "artwork",
        "label": "Social icons"
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
        "label": "Services line 1"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-2",
        "role": "text",
        "label": "Services line 2"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-3",
        "role": "text",
        "label": "Services line 3"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "Left-Sleeve-background",
        "role": "locked",
        "label": "Left Sleeve background"
      },
      {
        "zone": "Right Sleeve",
        "layerId": "Right-Sleeve-background",
        "role": "locked",
        "label": "Right Sleeve background"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "sleeve-flag",
        "role": "locked",
        "label": "Sleeve flag"
      }
    ],
    "previews": {
      "Front": "/assets/template-demos/13-front.png",
      "Back": "/assets/template-demos/13-back.png",
      "Left Sleeve": "/assets/template-demos/13-left-sleeve.png",
      "Right Sleeve": "/assets/template-demos/13-right-sleeve.png"
    }
  },
  {
    "id": "10000000-0000-4000-8000-000000000014",
    "template_id": "00000000-0000-4000-8000-000000000014",
    "name": "UNPUBLISHED · Pool Care · Tropical Demo",
    "categories": [
      "Pool Care"
    ],
    "range": "Premium · All-over print",
    "draftStatus": "Approved background; finished shirt remains a draft.",
    "backgroundSource": "12-pool-cleaning-tropical.png",
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
                "filename": "12-pool-cleaning-tropical.png",
                "src": "/assets/template-backgrounds/12-pool-cleaning-tropical.png",
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -30,
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
                "filename": "12-pool-cleaning-tropical.png",
                "src": "/assets/template-backgrounds/12-pool-cleaning-tropical.png",
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -48,
                "scale": 0.16,
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
                "id": "Back-social",
                "type": "image",
                "label": "Instagram • Facebook • Google",
                "filename": "social-row.png",
                "src": "/assets/template-demos/social-row.png",
                "x": 0,
                "y": -25,
                "scale": 0.055,
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
                "text": "888-888-8888",
                "x": 0,
                "y": -13,
                "scale": 0.72,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#053b55",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services",
                "type": "text",
                "label": "Services line 1",
                "text": "POOL CLEANING",
                "x": 0,
                "y": 1,
                "scale": 0.62,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#053b55",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-2",
                "type": "text",
                "label": "Services line 2",
                "text": "WATER CARE",
                "x": 0,
                "y": 12,
                "scale": 0.6,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#053b55",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-3",
                "type": "text",
                "label": "Services line 3",
                "text": "& MORE!",
                "x": 0,
                "y": 23,
                "scale": 0.58,
                "rotation": 0,
                "visible": true,
                "color": "#FFFFFF",
                "font": "Impact",
                "strokeColor": "#053b55",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Left Sleeve": {
            "background": "#053b55",
            "layers": [
              {
                "id": "Left-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "12-pool-cleaning-tropical.png",
                "src": "/assets/template-backgrounds/12-pool-cleaning-tropical.png",
                "x": 0,
                "y": -128.91433885100443,
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
                "id": "sleeve-flag",
                "type": "image",
                "label": "Sleeve flag",
                "filename": "demo-flag.png",
                "src": "/assets/template-demos/demo-flag.png",
                "x": 0,
                "y": 0,
                "scale": 0.2,
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
            "layers": [
              {
                "id": "Right-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "12-pool-cleaning-tropical.png",
                "src": "/assets/template-backgrounds/12-pool-cleaning-tropical.png",
                "x": 0,
                "y": -128.91433885100443,
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
              }
            ]
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
        "layerId": "Back-social",
        "role": "artwork",
        "label": "Social icons"
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
        "label": "Services line 1"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-2",
        "role": "text",
        "label": "Services line 2"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-3",
        "role": "text",
        "label": "Services line 3"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "Left-Sleeve-background",
        "role": "locked",
        "label": "Left Sleeve background"
      },
      {
        "zone": "Right Sleeve",
        "layerId": "Right-Sleeve-background",
        "role": "locked",
        "label": "Right Sleeve background"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "sleeve-flag",
        "role": "locked",
        "label": "Sleeve flag"
      }
    ],
    "previews": {
      "Front": "/assets/template-demos/14-front.png",
      "Back": "/assets/template-demos/14-back.png",
      "Left Sleeve": "/assets/template-demos/14-left-sleeve.png",
      "Right Sleeve": "/assets/template-demos/14-right-sleeve.png"
    }
  },
  {
    "id": "10000000-0000-4000-8000-000000000015",
    "template_id": "00000000-0000-4000-8000-000000000015",
    "name": "UNPUBLISHED · Business Crew · Soft Gradient Demo",
    "categories": [
      "General Business"
    ],
    "range": "Premium · All-over print",
    "draftStatus": "Approved background with black contact text; unpublished draft.",
    "backgroundSource": "15-abstract-soft-gradient.jpg",
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
                "filename": "15-abstract-soft-gradient.jpg",
                "src": "/assets/template-backgrounds/15-abstract-soft-gradient.jpg",
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -30,
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
                "filename": "15-abstract-soft-gradient.jpg",
                "src": "/assets/template-backgrounds/15-abstract-soft-gradient.jpg",
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
                "label": "Your logo",
                "filename": "blank-logo-slot.png",
                "src": "/assets/template-demos/blank-logo-slot.png",
                "x": 0,
                "y": -48,
                "scale": 0.16,
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
                "id": "Back-social",
                "type": "image",
                "label": "Instagram • Facebook • Google",
                "filename": "social-row.png",
                "src": "/assets/template-demos/social-row.png",
                "x": 0,
                "y": -25,
                "scale": 0.055,
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
                "text": "888-888-8888",
                "x": 0,
                "y": -13,
                "scale": 0.72,
                "rotation": 0,
                "visible": true,
                "color": "#000000",
                "font": "Impact",
                "strokeColor": "#282335",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services",
                "type": "text",
                "label": "Services line 1",
                "text": "YOUR BUSINESS SERVICES",
                "x": 0,
                "y": 1,
                "scale": 0.62,
                "rotation": 0,
                "visible": true,
                "color": "#000000",
                "font": "Impact",
                "strokeColor": "#282335",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-2",
                "type": "text",
                "label": "Services line 2",
                "text": "QUALITY SERVICE",
                "x": 0,
                "y": 12,
                "scale": 0.6,
                "rotation": 0,
                "visible": true,
                "color": "#000000",
                "font": "Impact",
                "strokeColor": "#282335",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              },
              {
                "id": "Back-services-3",
                "type": "text",
                "label": "Services line 3",
                "text": "& MORE!",
                "x": 0,
                "y": 23,
                "scale": 0.58,
                "rotation": 0,
                "visible": true,
                "color": "#000000",
                "font": "Impact",
                "strokeColor": "#282335",
                "strokeWidth": 2,
                "bold": false,
                "italic": false,
                "align": "center"
              }
            ]
          },
          "Left Sleeve": {
            "background": "#282335",
            "layers": [
              {
                "id": "Left-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "15-abstract-soft-gradient.jpg",
                "src": "/assets/template-backgrounds/15-abstract-soft-gradient.jpg",
                "x": 0,
                "y": -128.91433885100443,
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
                "id": "sleeve-flag",
                "type": "image",
                "label": "Sleeve flag",
                "filename": "demo-flag.png",
                "src": "/assets/template-demos/demo-flag.png",
                "x": 0,
                "y": 0,
                "scale": 0.2,
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
            "layers": [
              {
                "id": "Right-Sleeve-background",
                "type": "image",
                "label": "Sleeve background",
                "filename": "15-abstract-soft-gradient.jpg",
                "src": "/assets/template-backgrounds/15-abstract-soft-gradient.jpg",
                "x": 0,
                "y": -128.91433885100443,
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
              }
            ]
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
        "layerId": "Back-social",
        "role": "artwork",
        "label": "Social icons"
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
        "label": "Services line 1"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-2",
        "role": "text",
        "label": "Services line 2"
      },
      {
        "zone": "Back",
        "layerId": "Back-services-3",
        "role": "text",
        "label": "Services line 3"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "Left-Sleeve-background",
        "role": "locked",
        "label": "Left Sleeve background"
      },
      {
        "zone": "Right Sleeve",
        "layerId": "Right-Sleeve-background",
        "role": "locked",
        "label": "Right Sleeve background"
      },
      {
        "zone": "Left Sleeve",
        "layerId": "sleeve-flag",
        "role": "locked",
        "label": "Sleeve flag"
      }
    ],
    "previews": {
      "Front": "/assets/template-demos/15-front.png",
      "Back": "/assets/template-demos/15-back.png",
      "Left Sleeve": "/assets/template-demos/15-left-sleeve.png",
      "Right Sleeve": "/assets/template-demos/15-right-sleeve.png"
    }
  }
];
