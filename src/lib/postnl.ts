/**
 * PostNL shipping-label integration.
 *
 * The "Label" button on an order calls generateLabel(). With real credentials
 * this hits PostNL's Shipping/Label API (Barcode + Labelling endpoints) and
 * returns a barcode + a PDF label to print. Without credentials it runs in STUB
 * mode and returns a deterministic fake barcode so the admin flow is testable.
 *
 * Per the brief, the label is pre-filled with the recipient address from the
 * order; the only manual step left is paying/printing.
 */

export type LabelRecipient = {
  name: string;
  street: string;
  houseNr: string;
  zip: string;
  city: string;
  country: string;
};

export type LabelResult = {
  barcode: string;
  labelUrl: string | null; // PDF data URL or hosted URL
  stub: boolean;
};

const apiKey = process.env.POSTNL_API_KEY;
export const POSTNL_STUB = !apiKey;

const BASE_URL = "https://api.postnl.nl"; // production; use api-sandbox.postnl.nl for testing

function shipFrom() {
  return {
    Name: process.env.SHIP_FROM_NAME ?? "V&V Collectibles",
    Street: process.env.SHIP_FROM_STREET ?? "",
    HouseNr: process.env.SHIP_FROM_HOUSENR ?? "",
    Zipcode: (process.env.SHIP_FROM_ZIP ?? "").replace(/\s/g, ""),
    City: process.env.SHIP_FROM_CITY ?? "",
    Countrycode: process.env.SHIP_FROM_COUNTRY ?? "NL",
  };
}

export async function generateLabel(
  orderNumber: string,
  to: LabelRecipient,
): Promise<LabelResult> {
  if (POSTNL_STUB || !apiKey) {
    // 3S barcode-ish placeholder so the UI shows something realistic.
    const seed = orderNumber.replace(/\D/g, "").padStart(9, "0").slice(-9);
    return { barcode: `3SVVC${seed}`, labelUrl: null, stub: true };
  }

  const body = {
    Customer: {
      CustomerCode: process.env.POSTNL_CUSTOMER_CODE,
      CustomerNumber: process.env.POSTNL_CUSTOMER_NUMBER,
      CollectionLocation: process.env.POSTNL_COLLECTION_LOCATION,
      Address: { AddressType: "02", ...shipFrom() },
    },
    Message: {
      MessageID: orderNumber,
      Printertype: "GraphicFile|PDF",
    },
    Shipments: [
      {
        Addresses: [
          {
            AddressType: "01",
            Name: to.name,
            Street: to.street,
            HouseNr: to.houseNr,
            Zipcode: to.zip.replace(/\s/g, ""),
            City: to.city,
            Countrycode: to.country,
          },
        ],
        Dimension: { Weight: "2000" },
        ProductCodeDelivery: "3085", // standard NL parcel
      },
    ],
  };

  const res = await fetch(`${BASE_URL}/v2_2/label`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostNL label failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    ResponseShipments?: Array<{
      Barcode?: string;
      Labels?: Array<{ Content?: string }>;
    }>;
  };
  const shipment = data.ResponseShipments?.[0];
  const barcode = shipment?.Barcode ?? "";
  const content = shipment?.Labels?.[0]?.Content;
  const labelUrl = content ? `data:application/pdf;base64,${content}` : null;

  return { barcode, labelUrl, stub: false };
}
