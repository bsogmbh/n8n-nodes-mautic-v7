import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
  handleApiError,
  makeApiRequest,
  makePaginatedRequest,
  getOptionalParam,
  getRequiredParam,
  getMauticVersion,
  makePaginatedRequestV2,
} from '../utils/ApiHelpers';
import {
  buildQueryFromOptions,
  wrapSingleItem,
  convertNumericStrings,
  normaliseV2Item,
  normaliseV2Collection,
} from '../utils/DataHelpers';

export async function executeCampaignOperation(
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
        responseData = await createCampaign(context, i, useV2);
        break;
      case 'update':
        responseData = await updateCampaign(context, i, useV2);
        break;
      case 'clone':
        responseData = await cloneCampaign(context, i, useV2);
        break;
      case 'get':
        responseData = await getCampaign(context, i, useV2);
        break;
      case 'getAll':
        responseData = await getAllCampaigns(context, i, useV2);
        break;
      case 'getContacts':
        responseData = await getCampaignContacts(context, i, useV2);
        break;
      case 'delete':
        responseData = await deleteCampaign(context, i, useV2);
        break;
      default:
        throw new NodeOperationError(
          context.getNode(),
          `Operation '${operation}' is not supported for Campaign resource.`,
          { itemIndex: i },
        );
    }
    return context.helpers.returnJsonArray(wrapSingleItem(responseData));
  } catch (error) {
    return handleApiError(context, error, operation, 'Campaign');
  }
}

async function createCampaign(
  context: IExecuteFunctions,
  itemIndex: number,
  useV2 = false,
): Promise<any> {
  const name = getRequiredParam<string>(context, 'name', itemIndex);
  const additionalFields = getOptionalParam<IDataObject>(context, 'additionalFields', itemIndex, {});
  const body: IDataObject = { name, ...additionalFields };
  const endpoint = useV2 ? '/v2/campaigns' : '/campaigns/new';
  const response = await makeApiRequest(context, 'POST', endpoint, body);
  return useV2 ? normaliseV2Item(response) : response.campaign;
}

async function updateCampaign(
  context: IExecuteFunctions,
  itemIndex: number,
  useV2 = false,
): Promise<any> {
  const campaignId = getRequiredParam<string>(context, 'campaignId', itemIndex);
  const createIfNotFound = getOptionalParam<boolean>(context, 'createIfNotFound', itemIndex, false);
  const updateFields = getOptionalParam<IDataObject>(context, 'updateFields', itemIndex, {});
  const body: IDataObject = { ...updateFields };
  const method = createIfNotFound ? 'PUT' : 'PATCH';
  const endpoint = useV2 ? `/v2/campaigns/${campaignId}` : `/campaigns/${campaignId}/edit`;
  const headers = useV2 && method === 'PATCH' ? { 'Content-Type': 'application/merge-patch+json' } : {};
  const response = await makeApiRequest(context, method, endpoint, body, {}, undefined, headers);
  return useV2 ? normaliseV2Item(response) : response.campaign;
}

async function cloneCampaign(
  context: IExecuteFunctions,
  itemIndex: number,
  useV2 = false,
): Promise<any> {
  const campaignId = getRequiredParam<string>(context, 'campaignId', itemIndex);
  if (useV2) {
    // API v2 clone might be different or not exist directly as /clone
    // Mautic 7 API v2 usually follows REST. Let's try standard clone or throw.
    const response = await makeApiRequest(context, 'POST', `/v2/campaigns/${campaignId}/clone`);
    return normaliseV2Item(response);
  }
  const response = await makeApiRequest(context, 'POST', `/campaigns/clone/${campaignId}`);
  return response.campaign;
}

async function getCampaign(
  context: IExecuteFunctions,
  itemIndex: number,
  useV2 = false,
): Promise<any> {
  const campaignId = getRequiredParam<string>(context, 'campaignId', itemIndex);
  const endpoint = useV2 ? `/v2/campaigns/${campaignId}` : `/campaigns/${campaignId}`;
  const response = await makeApiRequest(context, 'GET', endpoint);
  return useV2 ? normaliseV2Item(response) : convertNumericStrings(response.campaign);
}

async function getAllCampaigns(
  context: IExecuteFunctions,
  itemIndex: number,
  useV2 = false,
): Promise<any> {
  const returnAll = getOptionalParam<boolean>(context, 'returnAll', itemIndex, false);
  const options = getOptionalParam<IDataObject>(context, 'options', itemIndex, {});
  const qs = buildQueryFromOptions(options);
  if (!qs.orderBy) qs.orderBy = 'id';
  if (!qs.orderByDir) qs.orderByDir = 'asc';

  if (useV2) {
    const endpoint = '/v2/campaigns';
    let results: any[];
    if (returnAll) {
      results = await makePaginatedRequestV2(context, 'campaigns', 'GET', endpoint, {}, qs);
    } else {
      qs.limit = getOptionalParam<number>(context, 'limit', itemIndex, 30);
      const response = await makeApiRequest(context, 'GET', endpoint, {}, qs);
      results = normaliseV2Collection(response);
    }
    return results;
  }

  if (returnAll) {
    const result = await makePaginatedRequest(context, 'campaigns', 'GET', '/campaigns', {}, qs);
    return convertNumericStrings(result);
  } else {
    qs.limit = getOptionalParam<number>(context, 'limit', itemIndex, 30);
    const response = await makeApiRequest(context, 'GET', '/campaigns', {}, qs);
    return convertNumericStrings(Object.values(response.campaigns || {}));
  }
}

async function getCampaignContacts(
  context: IExecuteFunctions,
  itemIndex: number,
  useV2 = false,
): Promise<any> {
  const campaignId = getRequiredParam<string>(context, 'campaignId', itemIndex);
  const returnAll = getOptionalParam<boolean>(context, 'returnAll', itemIndex, false);
  const options = getOptionalParam<IDataObject>(context, 'options', itemIndex, {});
  const qs = buildQueryFromOptions(options);

  const endpoint = useV2
    ? `/v2/campaigns/${campaignId}/contacts`
    : `/campaigns/${campaignId}/contacts`;

  if (useV2) {
    let results: any[];
    if (returnAll) {
      results = await makePaginatedRequestV2(context, 'contacts', 'GET', endpoint, {}, qs);
    } else {
      qs.limit = getOptionalParam<number>(context, 'limit', itemIndex, 30);
      const response = await makeApiRequest(context, 'GET', endpoint, {}, qs);
      results = normaliseV2Collection(response);
    }
    return results;
  }

  if (returnAll) {
    const result = await makePaginatedRequest(context, 'contacts', 'GET', endpoint, {}, qs);
    return convertNumericStrings(result);
  } else {
    qs.limit = getOptionalParam<number>(context, 'limit', itemIndex, 30);
    const response = await makeApiRequest(context, 'GET', endpoint, {}, qs);
    return convertNumericStrings(response.contacts);
  }
}

async function deleteCampaign(
  context: IExecuteFunctions,
  itemIndex: number,
  useV2 = false,
): Promise<any> {
  const campaignId = getRequiredParam<string>(context, 'campaignId', itemIndex);
  const endpoint = useV2 ? `/v2/campaigns/${campaignId}` : `/campaigns/${campaignId}/delete`;
  const response = await makeApiRequest(context, 'DELETE', endpoint);
  return useV2 ? { success: true, id: campaignId } : response.campaign;
}
