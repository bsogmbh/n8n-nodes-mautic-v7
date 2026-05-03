import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
  handleApiError,
  makeApiRequest,
  makePaginatedRequest,
  makePaginatedRequestV2,
  getOptionalParam,
  getRequiredParam,
  getMauticVersion,
} from '../utils/ApiHelpers';
import {
  buildQueryFromOptions,
  wrapSingleItem,
  convertNumericStrings,
  normaliseV2Item,
  normaliseV2Collection,
} from '../utils/DataHelpers';

export async function executeCompanyOperation(
  context: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<INodeExecutionData[]> {
  let responseData: any;
  try {
    const version = await getMauticVersion(context);
    const useV2 = version === 'v7';

    switch (operation) {
      case 'create':
        responseData = await createCompany(context, i, useV2);
        break;
      case 'update':
        responseData = await updateCompany(context, i, useV2);
        break;
      case 'get':
        responseData = await getCompany(context, i, useV2);
        break;
      case 'getAll':
        responseData = await getAllCompanies(context, i, useV2);
        break;
      case 'delete':
        responseData = await deleteCompany(context, i, useV2);
        break;
      default:
        throw new NodeOperationError(
          context.getNode(),
          `Operation '${operation}' is not supported for Company resource.`,
          { itemIndex: i },
        );
    }
    return context.helpers.returnJsonArray(wrapSingleItem(responseData));
  } catch (error) {
    return handleApiError(context, error, operation, 'Company');
  }
}

async function createCompany(
  context: IExecuteFunctions,
  itemIndex: number,
  useV2 = false,
): Promise<any> {
  const simple = getOptionalParam<boolean>(context, 'simple', itemIndex, false);
  const name = getRequiredParam<string>(context, 'name', itemIndex);
  const body: IDataObject = { companyname: name };

  const additionalFields = getOptionalParam<IDataObject>(context, 'additionalFields', itemIndex, {});
  addCompanyFields(body, additionalFields, useV2);

  const endpoint = useV2 ? '/v2/companies' : '/companies/new';
  const response = await makeApiRequest(context, 'POST', endpoint, body);
  let result = useV2 ? normaliseV2Item(response) : response.company;

  if (simple && !useV2) {
    result = result.fields?.all || result;
  }
  return result;
}

async function updateCompany(
  context: IExecuteFunctions,
  itemIndex: number,
  useV2 = false,
): Promise<any> {
  const companyId = getRequiredParam<string>(context, 'companyId', itemIndex);
  const simple = getOptionalParam<boolean>(context, 'simple', itemIndex, false);
  const body: IDataObject = {};

  const updateFields = getOptionalParam<IDataObject>(context, 'updateFields', itemIndex, {});
  addCompanyFields(body, updateFields, useV2);

  const endpoint = useV2 ? `/v2/companies/${companyId}` : `/companies/${companyId}/edit`;
  const headers = useV2 ? { 'Content-Type': 'application/merge-patch+json' } : {};
  const response = await makeApiRequest(context, 'PATCH', endpoint, body, {}, undefined, headers);
  let result = useV2 ? normaliseV2Item(response) : response.company;

  if (simple && !useV2) {
    result = result.fields?.all || result;
  }
  return result;
}

async function getCompany(
  context: IExecuteFunctions,
  itemIndex: number,
  useV2 = false,
): Promise<any> {
  const companyId = getRequiredParam<string>(context, 'companyId', itemIndex);
  const simple = getOptionalParam<boolean>(context, 'simple', itemIndex, false);
  const endpoint = useV2 ? `/v2/companies/${companyId}` : `/companies/${companyId}`;
  const response = await makeApiRequest(context, 'GET', endpoint);
  let result = useV2 ? normaliseV2Item(response) : response.company;

  if (simple && !useV2) {
    result = result.fields?.all || result;
  }
  return convertNumericStrings(result);
}

async function getAllCompanies(
  context: IExecuteFunctions,
  itemIndex: number,
  useV2 = false,
): Promise<any> {
  const returnAll = getOptionalParam<boolean>(context, 'returnAll', itemIndex, false);
  const simple = getOptionalParam<boolean>(context, 'simple', itemIndex, false);
  const additionalFields = getOptionalParam<IDataObject>(context, 'additionalFields', itemIndex, {});
  const qs = buildQueryFromOptions(additionalFields);
  if (!qs.orderBy) qs.orderBy = 'id';
  if (!qs.orderByDir) qs.orderByDir = 'asc';

  let responseData: any[];
  if (useV2) {
    const endpoint = '/v2/companies';
    if (returnAll) {
      responseData = await makePaginatedRequestV2(context, 'companies', 'GET', endpoint, {}, qs);
    } else {
      const limit = getOptionalParam<number>(context, 'limit', itemIndex, 30);
      qs.limit = limit;
      const response = await makeApiRequest(context, 'GET', endpoint, {}, qs);
      responseData = normaliseV2Collection(response);
    }
    return convertNumericStrings(responseData);
  }

  if (returnAll) {
    const limit = getOptionalParam<number | undefined>(context, 'limit', itemIndex, undefined);
    responseData = await makePaginatedRequest(
      context,
      'companies',
      'GET',
      '/companies',
      {},
      qs,
      limit,
    );
  } else {
    const limit = getRequiredParam<number>(context, 'limit', itemIndex);
    qs.limit = limit;
    const response = await makeApiRequest(context, 'GET', '/companies', {}, qs);
    responseData = (response.companies ? Object.values(response.companies) : []) as any[];
  }
  if (simple) {
    responseData = responseData.map((item: any) => item.fields?.all || item);
  }
  return convertNumericStrings(responseData);
}

async function deleteCompany(
  context: IExecuteFunctions,
  itemIndex: number,
  useV2 = false,
): Promise<any> {
  const simple = getOptionalParam<boolean>(context, 'simple', itemIndex, false);
  const companyId = getRequiredParam<string>(context, 'companyId', itemIndex);
  const endpoint = useV2 ? `/v2/companies/${companyId}` : `/companies/${companyId}/delete`;
  const response = await makeApiRequest(context, 'DELETE', endpoint);

  if (useV2) {
    return { success: true, id: companyId };
  }

  let result = response.company;
  if (simple) {
    result = result.fields?.all || result;
  }
  return result;
}

function addCompanyFields(body: IDataObject, fields: IDataObject, _useV2 = false) {
  const {
    addressUi,
    customFieldsUi,
    companyEmail,
    name,
    fax,
    industry,
    numberOfEmployees,
    phone,
    website,
    annualRevenue,
    description,
    ...rest
  } = fields as any;

  if (name) body.companyname = name as string;
  if (addressUi?.addressValues) {
    const { addressValues } = addressUi as { addressValues: IDataObject };
    body.companyaddress1 = addressValues.address1 as string;
    body.companyaddress2 = addressValues.address2 as string;
    body.companycity = addressValues.city as string;
    body.companystate = addressValues.state as string;
    body.companycountry = addressValues.country as string;
    body.companyzipcode = addressValues.zipCode as string;
  }

  if (companyEmail) body.companyemail = companyEmail as string;
  if (fax) body.companyfax = fax as string;
  if (industry) body.companyindustry = industry as string;
  if (numberOfEmployees) body.companynumber_of_employees = numberOfEmployees as number;
  if (phone) body.companyphone = phone as string;
  if (website) body.companywebsite = website as string;
  if (annualRevenue) body.companyannual_revenue = annualRevenue as number;
  if (description) body.companydescription = description as string;

  if ((customFieldsUi as any)?.customFieldValues) {
    const { customFieldValues } = customFieldsUi as {
      customFieldValues: Array<{ fieldId: string; fieldValue: string }>;
    };
    const data = customFieldValues.reduce(
      (obj, value) => Object.assign(obj, { [`${value.fieldId}`]: value.fieldValue }),
      {} as IDataObject,
    );
    Object.assign(body, data);
  }

  Object.assign(body, rest);
}
