import client from './client'

export async function createDistrictProposal(districtId, proposal) {
  const { data } = await client.post(`/districts/${districtId}/proposals`, proposal)
  return data
}

export async function listDistrictProposals(status) {
  const { data } = await client.get('/districts/proposals', { params: status ? { status } : {} })
  return data
}

export async function approveDistrictProposal(proposalId) {
  const { data } = await client.post(`/districts/proposals/${proposalId}/approve`)
  return data
}

export async function rejectDistrictProposal(proposalId) {
  const { data } = await client.post(`/districts/proposals/${proposalId}/reject`)
  return data
}
