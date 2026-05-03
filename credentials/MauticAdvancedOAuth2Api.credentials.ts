import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MauticAdvancedOAuth2Api implements ICredentialType {
  name = 'mauticAdvancedOAuth2Api';

  extends = ['oAuth2Api'];

  displayName = 'Mautic Advanced OAuth2 API';

  documentationUrl = 'mautic';

  properties: INodeProperties[] = [
    {
      displayName: 'Mautic URL',
      name: 'url',
      type: 'string',
      default: '',
      placeholder: 'https://name.mautic.net',
      required: true,
      description: 'The base URL of your Mautic instance (including https://)',
    },
    {
      displayName: 'Grant Type',
      name: 'grantType',
      type: 'hidden',
      default: 'authorizationCode',
    },
    {
      displayName: 'Authorization URL',
      name: 'authUrl',
      type: 'hidden',
      default: '={{$self["url"]}}/oauth/v2/authorize',
      required: true,
    },
    {
      displayName: 'Access Token URL',
      name: 'accessTokenUrl',
      type: 'hidden',
      default: '={{$self["url"]}}/oauth/v2/token',
      required: true,
    },
    {
      displayName: 'Scope',
      name: 'scope',
      type: 'hidden',
      default: '',
    },
    {
      displayName: 'Auth URI Query Parameters',
      name: 'authQueryParameters',
      type: 'hidden',
      default: '',
    },
    {
      displayName: 'Authentication',
      name: 'authentication',
      type: 'hidden',
      default: 'body',
    },
  ];
}
