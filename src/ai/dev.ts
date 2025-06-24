
import { config } from 'dotenv';
config();

// This file is the entrypoint for the Genkit developer UI.
// It will automatically discover and load all flows and other Genkit
// resources defined in this project.
//
// You can also import and register additional resources here.
import '@/ai/flows/describe-relationship-flow.ts';
