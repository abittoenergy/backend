
import { EstateRepo } from "../repository/estate";
import { NewEstate } from "../db/schema/estate.schema";
import AppError from "../utils/appError";
import ResponseHelper from "../utils/helpers/response.helper";

export default class EstateService {

  private estateRepo: EstateRepo;

  constructor() {
    this.estateRepo = new EstateRepo();
  }

  async createEstate(data: NewEstate) {
    return await this.estateRepo.create(data);
  }

  async updateEstate(id: string, data: Partial<NewEstate>) {
    const existingEstate = await this.estateRepo.findById(id);
    if (!existingEstate) {
      throw new AppError("Estate not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }
    return await this.estateRepo.update(id, data);
  }

  async getEstates() {
    return await this.estateRepo.findAll();
  }

  async getEstateById(id: string) {
    const estate = await this.estateRepo.findById(id);
    if (!estate) {
      throw new AppError("Estate not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }
    return estate;
  }

  async adminGetEstates(query: {
    page?: string;
    limit?: string;
    search?: string;
  }) {
    const page = parseInt(query.page || "1", 10);
    const limit = parseInt(query.limit || "20", 10);

    const [stats, { results, total }] = await Promise.all([
      this.estateRepo.getGlobalStats(),
      this.estateRepo.findAllAdmin({
        page,
        limit,
        search: query.search,
      }),
    ]);

    return {
      stats,
      estates: results,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
