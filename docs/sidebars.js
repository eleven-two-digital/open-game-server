/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Overview',
      items: [
        'intro',
        'overview/motivation',
        'overview/key-concepts',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/components',
        'architecture/security',
        'architecture/end-to-end-flow',
      ],
    },
    {
      type: 'category',
      label: 'Discovery Server',
      items: [
        'discovery/overview',
        'discovery/room-registration',
        'discovery/room-listing',
        'discovery/ticket-resolution',
        'discovery/mtls-authentication',
      ],
    },
    {
      type: 'category',
      label: 'Room Protocol',
      items: [
        'room-protocol/overview',
        'room-protocol/well-known',
        'room-protocol/handshake-ecdh',
        'room-protocol/schema-state',
        'room-protocol/caching-ttl-id',
        'room-protocol/transports',
      ],
    },
    {
      type: 'category',
      label: 'Admin API',
      items: [
        'admin/overview',
        'admin/authentication',
        'admin/room-lifecycle',
        'admin/moderation',
        'admin/dynamic-events',
      ],
    },
    {
      type: 'category',
      label: 'Implementation',
      items: [
        'implementation/getting-started',
        'implementation/client-examples',
        'implementation/room-examples',
        'implementation/deployment',
      ],
    },
  ],
};

module.exports = sidebars;
