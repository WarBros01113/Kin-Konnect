import { genkit as createGenkitInstance, Genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Define a unique symbol to store the Genkit instance on the global object
const GENKIT_SYMBOL = Symbol.for('app.kinkonnect.genkit');

// Augment the global type to include our symbol.
// This is a workaround for Next.js HMR re-initializing Genkit in development.
declare const global: {
  [GENKIT_SYMBOL]?: Genkit;
};

let ai: Genkit;

// Check for GOOGLE_GENAI_API_KEY
const googleApiKey = process.env.GOOGLE_GENAI_API_KEY;
if (!googleApiKey) {
  console.warn(
`[KinKonnect Genkit] WARNING: The GOOGLE_GENAI_API_KEY environment variable is not set.
The Google AI plugin (Genkit) will not be able to function correctly.
Please ensure this key is defined in your project's environment variables (e.g., in an .env file or through Firebase Studio's secret management).
You can get an API key from Google AI Studio: https://aistudio.google.com/app/apikey`
  );
}

// The googleAI() plugin will automatically use GOOGLE_GENAI_API_KEY from the environment.
const genkitPlugins = [googleAI()];

if (process.env.NODE_ENV === 'production') {
  // In production, always create a new instance.
  ai = createGenkitInstance({
    plugins: genkitPlugins,
  });
} else {
  // In development, try to reuse an existing instance from the global object.
  // This helps prevent re-initialization issues with Hot Module Replacement (HMR).
  if (!global[GENKIT_SYMBOL]) {
    console.log('[KinKonnect Genkit] Initializing new Genkit instance for development mode...');
    global[GENKIT_SYMBOL] = createGenkitInstance({
      plugins: genkitPlugins,
    });
  } else {
    console.log('[KinKonnect Genkit] Re-using existing Genkit instance from global for development mode.');
  }
  ai = global[GENKIT_SYMBOL]!;
}

export { ai };
