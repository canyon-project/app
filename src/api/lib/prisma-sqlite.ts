import "dotenv/config";
import { PrismaClient } from "../../../generated/schema-sqlite/client";

const prisma = new PrismaClient();

export { prisma };
