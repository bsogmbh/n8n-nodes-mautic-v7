import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MauticAdvancedApi implements ICredentialType {
	name = 'mauticAdvancedApi';

	displayName = 'Mautic Advanced API';

	documentationUrl = 'mautic';

	properties: INodeProperties[] = [
		{
			displayName: 'Mautic URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://name.mautic.net',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];
}
