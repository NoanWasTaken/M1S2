import { CompanyModel } from '../../models/company.js';
import { AppError } from '../../utils/app-error.js';

export async function getCompanyById(companyId: string) {
    const company = await CompanyModel.findById(companyId);
    if (!company) {
        throw new AppError(404, 'company_not_found', 'Company not found.');
    }
    return company;
}