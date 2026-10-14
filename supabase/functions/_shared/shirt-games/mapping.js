// Shared garment geometry and artwork frames. Business pricing stays in each host.
export const GARMENT_MAPPING = {
  "tshirt": {
    "model": "https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/tshirt.glb",
    "zones": [
      "Front",
      "Back",
      "Left Sleeve",
      "Right Sleeve",
      "Collar"
    ],
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
    }
  },
  "long-sleeve-tshirt": {
    "model": "https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/long-sleeve-tshirt.glb",
    "zones": [
      "Front",
      "Back",
      "Left Sleeve",
      "Right Sleeve",
      "Collar"
    ],
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
        "path": "/assets/templates/long-sleeve/sleeve.png",
        "width": 2690,
        "height": 4120
      },
      "Right Sleeve": {
        "path": "/assets/templates/long-sleeve/sleeve.png",
        "width": 2690,
        "height": 4120
      },
      "Collar": {
        "path": "/assets/templates/tshirt/collar.png",
        "width": 3276,
        "height": 435
      }
    }
  },
  "short-sleeve-polo": {
    "model": "https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/short-sleeve-polo.glb",
    "zones": [
      "Front",
      "Back",
      "Left Sleeve",
      "Right Sleeve",
      "Collar"
    ],
    "templates": {
      "Front": {
        "path": "/assets/templates/polo/front.png",
        "width": 3730,
        "height": 4980
      },
      "Back": {
        "path": "/assets/templates/polo/back.png",
        "width": 3730,
        "height": 5080
      },
      "Left Sleeve": {
        "path": "/assets/templates/polo/sleeve.png",
        "width": 2930,
        "height": 1740
      },
      "Right Sleeve": {
        "path": "/assets/templates/polo/sleeve.png",
        "width": 2930,
        "height": 1740
      },
      "Collar": {
        "path": "/assets/templates/polo/collar.png",
        "width": 3180,
        "height": 1130
      }
    }
  },
  "long-sleeve-polo": {
    "model": "https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/long-sleeve-polo.glb",
    "zones": [
      "Front",
      "Back",
      "Left Sleeve",
      "Right Sleeve",
      "Collar"
    ],
    "templates": {
      "Front": {
        "path": "/assets/templates/polo/front.png",
        "width": 3730,
        "height": 4980
      },
      "Back": {
        "path": "/assets/templates/polo/back.png",
        "width": 3730,
        "height": 5080
      },
      "Left Sleeve": {
        "path": "/assets/templates/long-sleeve/sleeve.png",
        "width": 2690,
        "height": 4120
      },
      "Right Sleeve": {
        "path": "/assets/templates/long-sleeve/sleeve.png",
        "width": 2690,
        "height": 4120
      },
      "Collar": {
        "path": "/assets/templates/polo/collar.png",
        "width": 3180,
        "height": 1130
      }
    }
  },
  "fleece-hoodie": {
    "model": "https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/fleece-hoodie.glb",
    "zones": [
      "Front",
      "Back",
      "Left Sleeve",
      "Right Sleeve",
      "Hood"
    ],
    "templates": {
      "Front": {
        "path": "/assets/templates/hoodie/front.png",
        "width": 3865,
        "height": 3884
      },
      "Back": {
        "path": "/assets/templates/hoodie/back.png",
        "width": 3865,
        "height": 4006
      },
      "Left Sleeve": {
        "path": "/assets/templates/hoodie/sleeve.png",
        "width": 3276,
        "height": 6124
      },
      "Right Sleeve": {
        "path": "/assets/templates/hoodie/sleeve.png",
        "width": 3276,
        "height": 6124
      },
      "Hood": {
        "path": "/assets/templates/hoodie/hood.png",
        "width": 4684,
        "height": 2073
      }
    }
  },
  "lightweight-jacket": {
    "model": "https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/lightweight-jacket.glb",
    "zones": [
      "Front",
      "Back",
      "Left Sleeve",
      "Right Sleeve",
      "Hood"
    ],
    "templates": {
      "Front": {
        "path": "/assets/templates/rain-jacket/front.png",
        "width": 4220,
        "height": 4740
      },
      "Back": {
        "path": "/assets/templates/hoodie/back.png",
        "width": 3865,
        "height": 4006
      },
      "Left Sleeve": {
        "path": "/assets/templates/hoodie/sleeve.png",
        "width": 3276,
        "height": 6124
      },
      "Right Sleeve": {
        "path": "/assets/templates/hoodie/sleeve.png",
        "width": 3276,
        "height": 6124
      },
      "Hood": {
        "path": "/assets/templates/hoodie/hood.png",
        "width": 4684,
        "height": 2073
      }
    }
  },
  "mask": {
    "model": "https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/mask-v3.glb",
    "zones": [
      "Entire Mask"
    ],
    "templates": {
      "Entire Mask": {
        "shape": "rectangle",
        "width": 3100,
        "height": 3110
      }
    }
  },
  "hood-mask-shirt": {
    "model": "https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/hood-mask-shirt.glb",
    "zones": [
      "Front",
      "Back",
      "Left Sleeve",
      "Right Sleeve",
      "Hood",
      "Built-In Mask"
    ],
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
        "path": "/assets/templates/long-sleeve/sleeve.png",
        "width": 2690,
        "height": 4120
      },
      "Right Sleeve": {
        "path": "/assets/templates/long-sleeve/sleeve.png",
        "width": 2690,
        "height": 4120
      },
      "Hood": {
        "path": "/assets/templates/hoodie/hood.png",
        "width": 4684,
        "height": 2073
      },
      "Built-In Mask": {
        "shape": "rectangle",
        "width": 3100,
        "height": 3110
      }
    }
  },
  "shorts": {
    "model": "https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/shorts.glb",
    "zones": [
      "Front",
      "Back"
    ],
    "templates": {
      "Front": {
        "path": "/assets/templates/shorts/front.png",
        "width": 2145,
        "height": 3480
      },
      "Back": {
        "path": "/assets/templates/shorts/back.png",
        "width": 2455,
        "height": 3650
      }
    }
  },
  "sweat-pants": {
    "model": "https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/sweat-pants.glb",
    "zones": [
      "Front",
      "Back"
    ],
    "templates": {
      "Front": {
        "path": "/assets/templates/sweat-pants/front.png",
        "width": 3670,
        "height": 5960
      },
      "Back": {
        "path": "/assets/templates/sweat-pants/back.png",
        "width": 3670,
        "height": 5960
      }
    }
  },
  "hooded-long-sleeve": {
    "model": "https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/hooded-long-sleeve.glb",
    "zones": [
      "Front",
      "Back",
      "Left Sleeve",
      "Right Sleeve",
      "Hood"
    ],
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
        "path": "/assets/templates/long-sleeve/sleeve.png",
        "width": 2690,
        "height": 4120
      },
      "Right Sleeve": {
        "path": "/assets/templates/long-sleeve/sleeve.png",
        "width": 2690,
        "height": 4120
      },
      "Hood": {
        "path": "/assets/templates/hoodie/hood.png",
        "width": 4684,
        "height": 2073
      }
    }
  },
  "hat": {
    "model": "https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/hat.glb",
    "zones": [
      "Front Panel",
      "Top of Bill"
    ],
    "templates": {
      "Front Panel": {
        "path": "/assets/templates/hat/front-panel.png",
        "width": 1151,
        "height": 1050
      },
      "Top of Bill": {
        "path": "/assets/templates/hat/top-of-bill.png",
        "width": 1169,
        "height": 941
      }
    }
  }
};

// Upgrade cached catalog geometry without replacing host names or prices.
export function applyGarmentMappings(catalog){
  for(const item of catalog){const mapping=GARMENT_MAPPING[item.id];if(mapping)Object.assign(item,structuredClone(mapping));}
  return catalog;
}
