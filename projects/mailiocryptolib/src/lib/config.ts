import { InjectionToken } from "@angular/core";
import { MailioConfig } from "./models/MailioConfig";

export const MAILIO_CONFIG = new InjectionToken<MailioConfig>('mailio_config');
