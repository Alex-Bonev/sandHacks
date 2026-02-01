import toast from 'svelte-french-toast';

export interface GitHubFile {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  html_url: string;
  user: {
    login: string;
  };
  created_at: string;
}

export interface BranchComparison {
  status: string;
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  files: {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
  }[];
  // Add this:
  commits: {
    sha: string;
    commit: {
      message: string;
      author: {
        name: string;
        date: string;
      };
    };
    html_url: string;
    author?: {
      login: string;
      avatar_url: string;
    };
  }[];
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface PRFile {
  sha: string;
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  patch?: string; // The diff
}


const API_BASE = 'https://api.github.com';

const getHeaders = (token?: string) => {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (token && token.trim().length > 0) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }
  return headers;
};

export const parseRepoUrl = (url: string) => {
  
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.replace(/\.git$/, '');
    const parts = pathname.split('/').filter(Boolean);
    
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] };
    }
  } catch (e) {
    return null;
  }
  return null;
};



export const fetchRepoTree = async (owner: string, repo: string, token?: string): Promise<GitHubFile[]> => {
  const toastId = toast.loading('Fetching repository tree...');
  const repoUrl = `${API_BASE}/repos/${owner}/${repo}`;
  const repoRes = await fetch(repoUrl, {
    headers: getHeaders(token),
  });

  if (!repoRes.ok) {
    const errorData = await repoRes.json().catch(() => ({}));
    const msg = errorData.message || repoRes.statusText;
    
    if (repoRes.status === 401) {
      toast.error('Bad Credentials: The GitHub token is invalid or expired.', { id: toastId });
      throw new Error('Bad Credentials: The GitHub token is invalid or expired.');
    }
    if (repoRes.status === 403 && msg.includes('rate limit')) {
      toast.error('Rate Limit Exceeded: Please add a valid GitHub Token in Settings.', { id: toastId });
      throw new Error('Rate Limit Exceeded: Please add a valid GitHub Token in Settings.');
    }
    if (repoRes.status === 404) {
      toast.error(`Repository not found: ${owner}/${repo}`, { id: toastId });
      throw new Error(`Repository not found: ${owner}/${repo}`);
    }
    toast.error(`GitHub Error: ${msg}`, { id: toastId });
    throw new Error(`GitHub Error: ${msg}`);
  }

  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch || 'main';

  const treeUrl = `${API_BASE}/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`;
  const treeRes = await fetch(treeUrl, {
    headers: getHeaders(token),
  });

  if (!treeRes.ok) {
    throw new Error(`Failed to fetch file tree: ${treeRes.statusText}`);
  }

  const treeData = await treeRes.json();
  
  if (treeData.truncated) {
    console.warn('Repository is too large, some files may be missing.');
  }

  toast.success('Repository loaded!', { id: toastId });
  return treeData.tree.filter((item: any) => item.type === 'blob');
};

export const fetchFileContent = async (owner: string, repo: string, path: string, token?: string): Promise<string> => {
  const res = await fetch(`${API_BASE}/repos/${owner}/${repo}/contents/${path}`, {
    headers: getHeaders(token),
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch file: ${path}`);
  }
  
  const data = await res.json();
  
  if (data.encoding === 'base64' && data.content) {
    try {
      const binaryString = atob(data.content.replace(/\s/g, ''));
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    } catch (e) {
      return '// Error: Could not decode file content';
    }
  }
  
  return data.content || '';
};

export const fetchPullRequests = async (owner: string, repo: string, token?: string): Promise<PullRequest[]> => {
  const url = `${API_BASE}/repos/${owner}/${repo}/pulls?state=open&sort=updated&direction=desc`;
  const res = await fetch(url, {
    headers: getHeaders(token),
  });

  if (!res.ok) {
    console.warn('Failed to fetch PRs');
    return [];
  }

  return await res.json();
};


export const fetchBranches = async (owner: string, repo: string, token?: string): Promise<GitHubBranch[]> => {
  const url = `${API_BASE}/repos/${owner}/${repo}/branches?per_page=100`;
  const res = await fetch(url, { headers: getHeaders(token) });
  if (!res.ok) throw new Error('Failed to fetch branches');
  return await res.json();
};

export const compareBranches = async (
  owner: string, 
  repo: string, 
  base: string, 
  head: string, 
  token?: string
): Promise<BranchComparison> => {
  // api.github.com/repos/:owner/:repo/compare/:base...:head
  const url = `${API_BASE}/repos/${owner}/${repo}/compare/${base}...${head}`;
  const res = await fetch(url, { headers: getHeaders(token) });
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to compare branches');
  }
  
  return await res.json();
};

export const fetchPullRequestFiles = async (
  owner: string, 
  repo: string, 
  prNumber: number, 
  token?: string
): Promise<PRFile[]> => {
  const url = `${API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}/files`;
  const res = await fetch(url, { headers: getHeaders(token) });
  if (!res.ok) throw new Error('Failed to fetch PR files');
  return await res.json();
};